import {Request, Response} from "express"
import {Mood} from "../model/Mood"
import {Room} from "../model/Room";
import {User} from "../model/User";
import {GetObjectCommand} from "@aws-sdk/client-s3";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";
import client from "../util/s3Client";
import {sendNotificationToUser} from "../fcm/NotificationService";

const getPastMoodsList = async (req: Request, res: Response) => {
    try {
        const code = req.body.code;
        const PAGE_SIZE = 20

        // page is taken from query string: /moods?page=2
        const page = parseInt(req.params.page as string) || 1;
        const skip = (page - 1) * PAGE_SIZE;

        // Check if room exists
        const room = await Room.exists({ code });
        if (!room) {
            res.status(404).json({ error: "No room found for given code" });
            return;
        }

        // Get total count for this code (for frontend to know number of pages)
        const totalMoods = await Mood.countDocuments({ code });

        // Fetch paginated moods: newest first
        const moods = await Mood.find({ code })
            .sort({ timestamp: -1 })   // assumes you have timestamps / createdAt
            .skip(skip)
            .limit(PAGE_SIZE);

        if (!moods || moods.length === 0) {
            res.status(404).json({ error: "Could not find past moods" });
            return;
        }

        res.status(200).json({
            data: moods,
            pagination: {
                page,
                pageSize: PAGE_SIZE,
                totalItems: totalMoods,
                totalPages: Math.ceil(totalMoods / PAGE_SIZE),
                hasNextPage: page * PAGE_SIZE < totalMoods,
                hasPrevPage: page > 1,
            },
        })
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
}

const sendMood = async (req: Request, res: Response) => {
    const { moodId, senderId, receiverId } = req.body

    // flags + error messages
    let moodSaved = false
    let notificationSent = false
    let errorReasonMood: string | null = null
    let errorReasonNotification: string | null = null

    try {
        // 1) Save mood
        try {
            if (senderId === receiverId) {
                res.status(404).json({error: "Sender & Receiver can not be same"})
                return
            }

            const codeWrapper = await User.findOne({ id: senderId }).select('code')
            if (!codeWrapper) {
                errorReasonMood = 'Could not find room code'
                res.status(404).json({
                    moodSaved: false,
                    notificationSent: false,
                    errorReasonMood,
                    errorReasonNotification,
                })
                return
            }

            const count = await Mood.countDocuments({}, { hint: '_id_' })

            const newMood = new Mood({
                id: count + 1,
                senderId: parseInt(senderId),
                receiverId: parseInt(receiverId),
                moodId,
                code: codeWrapper.code,
            })

            const mood = await newMood.save()
            moodSaved = true

            // 2) Try to send notification
            try {
                await sendNotificationToUser(receiverId, {
                    type: 'mood',
                    moodId: String(moodId),
                    receiverId: String(receiverId),
                    senderId: String(senderId),
                    timestamp: String(mood.timestamp),
                })

                notificationSent = true

                // both success
                res.status(200).json({
                    moodSaved,
                    notificationSent,
                    mood,
                    errorReasonMood,
                    errorReasonNotification,
                })
            } catch (err: any) {
                console.error('Notification error:', err)
                errorReasonNotification = err?.message || 'Notification failed'

                // mood saved but notification failed
                // still 200, but tell client what happened
                res.status(200).json({
                    moodSaved,
                    notificationSent,
                    mood,
                    errorReasonMood,
                    errorReasonNotification,
                })
            }
        } catch (err: any) {
            console.error('Mood save error:', err)
            errorReasonMood = err?.message || 'Failed to save mood'

            // mood failed → notification not attempted
            res.status(500).json({
                moodSaved,
                notificationSent,
                errorReasonMood,
                errorReasonNotification,
            })
        }
    } catch (outerErr) {
        console.error('Unexpected sendMood error:', outerErr)

        res.status(500).json({
            moodSaved,
            notificationSent,
            errorReasonMood: errorReasonMood || 'Unexpected server error',
            errorReasonNotification,
        })
    }
}

const getLastMood = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id)

        if (Number.isNaN(id)) {
            res.status(400).json({ error: 'Invalid id' })
            return
        }

        // run in parallel
        const [lastAsReceiver, lastAsSender] = await Promise.all([
            Mood.findOne({ receiverId: id }).sort({ timestamp: -1 }).exec(),
            Mood.findOne({ senderId: id }).sort({ timestamp: -1 }).exec(),
        ])

        if (!lastAsReceiver && !lastAsSender) {
            res.status(404).json({ error: 'No moods found for this user' })
            return
        }

        res.status(200).json({
            moods: [lastAsReceiver, lastAsSender].filter(Boolean),
        })
    } catch (err) {
        console.error('getLastMood error:', err)
        res.status(500).json({ error: err })
    }
}

export default {
    getPastMoodsList,
    sendMood,
    getLastMood
}