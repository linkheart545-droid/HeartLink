import {Request, Response} from "express"
import {Mood} from "../model/Mood"
import {Room} from "../model/Room";
import {User} from "../model/User";
import {GetObjectCommand} from "@aws-sdk/client-s3";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";
import client from "../util/s3Client";
import {sendNotificationToUser} from "../fcm/NotificationService";

const getPastMoodsList = async(req: Request, res: Response) => {
    const code = req.body.code
    const moods = await Mood.find({ code: code })
    const room = await Room.exists({ code: code })

    if (!room) {
        res.status(404).json({error: "No room found for given code"})
        return
    }

    if (!moods) {
        res.status(404).json({error: "Could not find past moods"})
        return
    }

    const user1 = await User.findOne({id: moods[0].senderId})
    const user2 = await User.findOne({id: moods[0].receiverId})

    if (!user1 || !user2) {
        res.status(404).json({error: "Could not find users"})
        return
    }

    if (user1.profileImageUrl != "") {
        const getObjectParams = {
            Bucket: process.env.BUCKET_NAME!!,
            Key: user1.profileImageUrl
        }

        const command = new GetObjectCommand(getObjectParams)
        user1.profileImageUrl = await getSignedUrl(client, command, {expiresIn: 3600})
    }

    if (user2.profileImageUrl != "") {
        const getObjectParams = {
            Bucket: process.env.BUCKET_NAME!!,
            Key: user2.profileImageUrl
        }

        const command = new GetObjectCommand(getObjectParams)
        user2.profileImageUrl = await getSignedUrl(client, command, {expiresIn: 3600})
    }

    const list = []

    for (const mood of moods) {
        const json = {
            id: mood.id,
            moodId: mood.moodId,
            sender: user1,
            receiver: user2,
            code: code,
            timestamp: mood.timestamp
        }
        list.push(json)
    }

    res.status(200).json(list)
}

const sendMood = async(req: Request, res: Response) => {
    const {moodId, senderId, receiverId} = req.body

    const codeWrapper = await User.findOne({id: senderId}).select('code')
    if (!codeWrapper) {
        res.status(404).json({error: "Could not find room code"})
        return
    }

    const count = await Mood.countDocuments({}, { hint: '_id_' })

    const newMood = new Mood({
        id: count+1,
        senderId: parseInt(senderId),
        receiverId: parseInt(receiverId),
        moodId: moodId,
        code: codeWrapper.code
    })

    const mood = await newMood.save()

    await sendNotificationToUser(receiverId, {
        moodId: moodId,
        receiverId: receiverId,
        senderId: senderId
    });

    res.status(200).json(mood)
}

export default {
    getPastMoodsList,
    sendMood
}