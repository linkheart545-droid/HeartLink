"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const Mood_1 = require("../model/Mood");
const Room_1 = require("../model/Room");
const User_1 = require("../model/User");
const NotificationService_1 = require("../fcm/NotificationService");
const getPastMoodsList = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const code = req.body.code;
        const PAGE_SIZE = 20;
        // page is taken from query string: /moods?page=2
        const page = parseInt(req.params.page) || 1;
        const skip = (page - 1) * PAGE_SIZE;
        // Check if room exists
        const room = yield Room_1.Room.exists({ code });
        if (!room) {
            res.status(404).json({ error: "No room found for given code" });
            return;
        }
        // Get total count for this code (for frontend to know number of pages)
        const totalMoods = yield Mood_1.Mood.countDocuments({ code });
        // Fetch paginated moods: newest first
        const moods = yield Mood_1.Mood.find({ code })
            .sort({ timestamp: -1 }) // assumes you have timestamps / createdAt
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
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});
const sendMood = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { moodId, senderId, receiverId } = req.body;
    // flags + error messages
    let moodSaved = false;
    let notificationSent = false;
    let errorReasonMood = null;
    let errorReasonNotification = null;
    try {
        // 1) Save mood
        try {
            if (senderId === receiverId) {
                res.status(404).json({ error: "Sender & Receiver can not be same" });
                return;
            }
            const codeWrapper = yield User_1.User.findOne({ id: senderId }).select('code');
            if (!codeWrapper) {
                errorReasonMood = 'Could not find room code';
                res.status(404).json({
                    moodSaved: false,
                    notificationSent: false,
                    errorReasonMood,
                    errorReasonNotification,
                });
                return;
            }
            const count = yield Mood_1.Mood.countDocuments({}, { hint: '_id_' });
            const newMood = new Mood_1.Mood({
                id: count + 1,
                senderId: parseInt(senderId),
                receiverId: parseInt(receiverId),
                moodId,
                code: codeWrapper.code,
            });
            const mood = yield newMood.save();
            moodSaved = true;
            // 2) Try to send notification
            try {
                yield (0, NotificationService_1.sendNotificationToUser)(receiverId, {
                    moodId: String(moodId),
                    receiverId: String(receiverId),
                    senderId: String(senderId),
                    timestamp: String(mood.timestamp),
                });
                notificationSent = true;
                // both success
                res.status(200).json({
                    moodSaved,
                    notificationSent,
                    mood,
                    errorReasonMood,
                    errorReasonNotification,
                });
            }
            catch (err) {
                console.error('Notification error:', err);
                errorReasonNotification = (err === null || err === void 0 ? void 0 : err.message) || 'Notification failed';
                // mood saved but notification failed
                // still 200, but tell client what happened
                res.status(200).json({
                    moodSaved,
                    notificationSent,
                    mood,
                    errorReasonMood,
                    errorReasonNotification,
                });
            }
        }
        catch (err) {
            console.error('Mood save error:', err);
            errorReasonMood = (err === null || err === void 0 ? void 0 : err.message) || 'Failed to save mood';
            // mood failed → notification not attempted
            res.status(500).json({
                moodSaved,
                notificationSent,
                errorReasonMood,
                errorReasonNotification,
            });
        }
    }
    catch (outerErr) {
        console.error('Unexpected sendMood error:', outerErr);
        res.status(500).json({
            moodSaved,
            notificationSent,
            errorReasonMood: errorReasonMood || 'Unexpected server error',
            errorReasonNotification,
        });
    }
});
const getLastMood = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id);
        if (Number.isNaN(id)) {
            res.status(400).json({ error: 'Invalid id' });
            return;
        }
        // run in parallel
        const [lastAsReceiver, lastAsSender] = yield Promise.all([
            Mood_1.Mood.findOne({ receiverId: id }).sort({ timestamp: -1 }).exec(),
            Mood_1.Mood.findOne({ senderId: id }).sort({ timestamp: -1 }).exec(),
        ]);
        if (!lastAsReceiver && !lastAsSender) {
            res.status(404).json({ error: 'No moods found for this user' });
            return;
        }
        res.status(200).json({
            moods: [lastAsReceiver, lastAsSender].filter(Boolean),
        });
    }
    catch (err) {
        console.error('getLastMood error:', err);
        res.status(500).json({ error: err });
    }
});
exports.default = {
    getPastMoodsList,
    sendMood,
    getLastMood
};
