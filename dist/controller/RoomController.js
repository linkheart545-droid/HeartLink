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
const node_crypto_1 = require("node:crypto");
const Room_1 = require("../model/Room");
const User_1 = require("../model/User");
const mongoose_1 = __importDefault(require("mongoose"));
const NotificationService_1 = require("../fcm/NotificationService");
const generateCode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let code = (0, node_crypto_1.randomInt)(0, 100000);
        let codeExists = yield Room_1.Room.exists({ code: code.toString() });
        while (codeExists) {
            code = (0, node_crypto_1.randomInt)(0, 100000);
            codeExists = yield Room_1.Room.exists({ code: code.toString() });
        }
        res.status(200).json({ code: code.toString() });
    }
    catch (error) {
        res.status(500).json({ message: "Unable to generate code", error: error.message });
    }
});
const createRoomAndAssignCode = (ownerId, joinerId, code) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const exists = yield Room_1.Room.exists({ code: code });
        if (exists) {
            console.log(`Room with code ${code} already exists`);
            yield session.abortTransaction();
        }
        // Create the room
        const room = new Room_1.Room({ userId1: ownerId, userId2: joinerId, code });
        yield room.save({ session });
        console.log(`Owner : ${ownerId}, Joiner ID : ${joinerId}, Code : ${code}`);
        // Update both users atomically
        yield User_1.User.updateMany({ id: { $in: [ownerId, joinerId] } }, { $set: { code } }, { session });
        yield session.commitTransaction();
        console.log(`Room ${code} created and users updated successfully`);
        return room;
    }
    catch (err) {
        yield session.abortTransaction();
        console.error('Failed to create room or update users:', err);
        throw err;
    }
    finally {
        yield session.endSession();
    }
});
const leaveRoom = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, code } = req.body;
        const room = yield Room_1.Room.findOne({ code: code });
        if (!room) {
            res.status(404).json({ error: "Room not found" });
            return;
        }
        let partnerId;
        let senderId;
        if (room.userId1 == userId) {
            senderId = room.userId1;
            partnerId = room.userId2;
        }
        else {
            senderId = room.userId2;
            partnerId = room.userId1;
        }
        console.log(`Partner Id: ${partnerId}, SenderId: ${senderId}`);
        yield User_1.User.updateMany({ id: { $in: [room.userId1, room.userId2] } }, { $set: { code: "" } });
        yield room.deleteOne();
        yield (0, NotificationService_1.sendNotificationToUser)(partnerId.toString(), {
            type: 'leave',
            senderId: String(senderId),
            receiverId: String(partnerId),
            timestamp: String(Date.now())
        });
        res.status(200).json({ message: 'Room deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: "Unable to leave room", error: error.message });
    }
});
exports.default = {
    generateCode,
    createRoomAndAssignCode,
    leaveRoom
};
