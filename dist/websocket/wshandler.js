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
exports.handleMessage = exports.getClientSocket = exports.removeClientSocket = exports.setClientSocket = void 0;
const ws_1 = require("ws");
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
        // Check if the receiver is connected
        const receiverSocket = (0, exports.getClientSocket)(msg.receiverId);
        if (receiverSocket && receiverSocket.readyState === ws_1.WebSocket.OPEN) {
            console.log(`Forwarding message to receiver ${msg.receiverId}`);
            receiverSocket.send(JSON.stringify(msg));
        }
        else {
            console.log(`Receiver ${msg.receiverId} is not connected or socket not open`);
        }
        // (Optional) Acknowledge to sender
        ws.send(JSON.stringify(msg));
        console.log(`Acknowledgment sent to sender ${msg.senderId}`);
    }
    catch (error) {
        console.error('Invalid JSON received:', data);
        ws.send(JSON.stringify({ error: 'Invalid message format' }));
    }
});
exports.handleMessage = handleMessage;
