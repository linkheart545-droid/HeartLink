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
exports.handleMessage = exports.getClientSocket = exports.removeClientSocket = exports.setClientSocket = void 0;
const ws_1 = require("ws");
const Chat_1 = require("../model/Chat");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const s3Client_1 = __importDefault(require("../util/s3Client"));
const clients = new Map(); // move this to a shared module if needed
const setClientSocket = (userId, ws) => {
    if (!clients.has(userId)) {
        clients.set(userId, ws);
        console.log(`Registered senderId ${userId}`);
    }
};
exports.setClientSocket = setClientSocket;
const removeClientSocket = (ws) => {
    for (const [userId, socket] of clients.entries()) {
        if (socket === ws) {
            clients.delete(userId);
            break;
        }
    }
};
exports.removeClientSocket = removeClientSocket;
const getClientSocket = (userId) => {
    return clients.get(userId);
};
exports.getClientSocket = getClientSocket;
const handleMessage = (ws, data) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const msg = JSON.parse(data);
        console.log(`Handling message from ${msg.senderId} to ${msg.receiverId}:`, msg);
        const imageName = msg.attachment;
        if (imageName && imageName.length != 0) {
            const getObjectParams = {
                Bucket: process.env.BUCKET_NAME,
                Key: imageName
            };
            const command = new client_s3_1.GetObjectCommand(getObjectParams);
            msg.attachment = yield (0, s3_request_presigner_1.getSignedUrl)(s3Client_1.default, command, { expiresIn: 3600 });
        }
        // Check if the receiver is connected
        const receiverSocket = (0, exports.getClientSocket)(msg.receiverId);
        if (receiverSocket && receiverSocket.readyState === ws_1.WebSocket.OPEN) {
            console.log(`Forwarding message to receiver ${msg.receiverId}`);
            receiverSocket.send(JSON.stringify(msg));
        }
        else {
            console.log(`Receiver ${msg.receiverId} is not connected or socket not open`);
        }
        const count = yield Chat_1.Chat.countDocuments({}, { hint: '_id_' });
        const newChat = new Chat_1.Chat({
            id: count + 1,
            senderId: msg.senderId,
            receiverId: msg.receiverId,
            code: msg.code,
            message: msg.message,
            attachment: imageName !== null && imageName !== void 0 ? imageName : "",
            timestamp: msg.timestamp
        });
        yield newChat.save();
        ws.send(JSON.stringify({ type: 'Acknowledgment', message: msg }));
        console.log(`Acknowledgment sent to sender ${msg.senderId}`);
    }
    catch (error) {
        console.error('Invalid JSON received:', data);
        ws.send(JSON.stringify({ error: 'Invalid message format' }));
    }
});
exports.handleMessage = handleMessage;
