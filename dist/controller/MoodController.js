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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Mood_1 = require("../model/Mood");
const Room_1 = require("../model/Room");
const User_1 = require("../model/User");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const s3Client_1 = __importDefault(require("../util/s3Client"));
const NotificationService_1 = require("../fcm/NotificationService");
const getPastMoodsList = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const code = req.body.code;
    const moods = yield Mood_1.Mood.find({ code: code });
    const room = yield Room_1.Room.exists({ code: code });
    if (!room) {
        res.status(404).json({ error: "No room found for given code" });
        return;
    }
    if (!moods) {
        res.status(404).json({ error: "Could not find past moods" });
        return;
    }
    const user1 = yield User_1.User.findOne({ id: moods[0].senderId });
    const user2 = yield User_1.User.findOne({ id: moods[0].receiverId });
    if (!user1 || !user2) {
        res.status(404).json({ error: "Could not find users" });
        return;
    }
    if (user1.profileImageUrl != "") {
        const getObjectParams = {
            Bucket: process.env.BUCKET_NAME,
            Key: user1.profileImageUrl
        };
        const command = new client_s3_1.GetObjectCommand(getObjectParams);
        user1.profileImageUrl = yield (0, s3_request_presigner_1.getSignedUrl)(s3Client_1.default, command, { expiresIn: 3600 });
    }
    if (user2.profileImageUrl != "") {
        const getObjectParams = {
            Bucket: process.env.BUCKET_NAME,
            Key: user2.profileImageUrl
        };
        const command = new client_s3_1.GetObjectCommand(getObjectParams);
        user2.profileImageUrl = yield (0, s3_request_presigner_1.getSignedUrl)(s3Client_1.default, command, { expiresIn: 3600 });
    }
    const list = [];
    for (const mood of moods) {
        const json = {
            id: mood.id,
            moodId: mood.moodId,
            sender: user1,
            receiver: user2,
            code: code,
            timestamp: mood.timestamp
        };
        list.push(json);
    }
    res.status(200).json(list);
});
const getLastMood = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const partnerId = parseInt(req.params.id);
    const codeWrapper = yield User_1.User.findOne({ id: partnerId }).select('code');
    if (!codeWrapper) {
        res.status(404).json({ error: "Could not find last mood" });
        return;
    }
    const mood = yield Mood_1.Mood.findOne({ code: codeWrapper.code })
        .sort({ timestamp: -1 }); // newest date first
    const room = yield Room_1.Room.exists({ code: codeWrapper.code });
    if (!room) {
        res.status(404).json({ error: "No room found for given code" });
        return;
    }
    if (!mood) {
        res.status(404).json({ error: "Could not find last mood" });
        return;
    }
    res.status(200).json(mood);
});
const sendMood = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { title, body, moodId, senderId, receiverId } = req.body;
    const codeWrapper = yield User_1.User.findOne({ id: senderId }).select('code');
    if (!codeWrapper) {
        res.status(404).json({ error: "Could not find room code" });
        return;
    }
    const count = yield Mood_1.Mood.countDocuments({}, { hint: '_id_' });
    const newMood = new Mood_1.Mood({
        id: count + 1,
        senderId: senderId,
        receiverId: receiverId,
        moodId: moodId,
        code: codeWrapper.code
    });
    const mood = yield newMood.save();
    yield (0, NotificationService_1.sendNotificationToUser)(receiverId, {
        title: title,
        body: body,
        moodId: moodId,
        receiverId: receiverId,
        senderId: senderId
    });
    res.status(200).json(mood);
});
exports.default = {
    getPastMoodsList,
    getLastMood,
    sendMood
};
