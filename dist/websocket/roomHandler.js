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
exports.handleRoomMessage = exports.removeRoomClient = exports.setRoomMap = exports.setRoomClient = void 0;
const ws_1 = require("ws");
const RoomController_1 = __importDefault(require("../controller/RoomController"));
const NotificationService_1 = require("../fcm/NotificationService");
// Connected clients: userId → socket
const roomClients = new Map();
// Room map: code → owner userId
const roomMap = new Map();
// code → joinerId (only when join-request is sent)
const joiningState = new Map();
const finalAckState = new Map();
const setRoomClient = (userId, ws) => {
    roomClients.set(userId, ws);
};
exports.setRoomClient = setRoomClient;
const setRoomMap = (userId, code, ws) => {
    if (roomMap.has(code)) {
        const existingOwner = roomMap.get(code);
        if (existingOwner === userId) {
            // same owner reconnecting, you might allow it (optional)
            console.log(`User ${userId} reconnected to existing room ${code}`);
        }
        else {
            // another user trying to take an already owned code
            ws.send(JSON.stringify({
                error: `Room code ${code} already in use by another user (${existingOwner})`
            }));
            ws.close(1008, 'Room code already in use'); // 1008 = policy violation
            console.log(`Rejected user ${userId} for duplicate room code ${code}`);
            return;
        }
    }
    else {
        roomMap.set(code, userId);
        console.log(`Created new room ${code} for user ${userId}`);
    }
};
exports.setRoomMap = setRoomMap;
const removeRoomClient = (ws) => {
    for (const [id, socket] of roomClients.entries()) {
        if (socket !== ws)
            continue;
        console.log(`User ${id} disconnected`);
        // Case 1 — User was owner of a room
        for (const [code, ownerId] of roomMap.entries()) {
            if (ownerId === id) {
                console.log(`Owner ${id} disconnected from room ${code}`);
                const joinerId = joiningState.get(code);
                const joinerSocket = joinerId ? roomClients.get(joinerId) : undefined;
                if (joinerSocket && joinerSocket.readyState === ws_1.WebSocket.OPEN) {
                    joinerSocket.send(JSON.stringify({
                        type: "join-disconnect",
                        userId: id,
                        code,
                        message: "Owner disconnected during joining"
                    }));
                }
                // clean up
                roomMap.delete(code);
                joiningState.delete(code);
            }
        }
        // Case 2 — User was joiner
        for (const [code, joinerId] of joiningState.entries()) {
            if (joinerId === id) {
                const ownerId = roomMap.get(code);
                const ownerSocket = ownerId ? roomClients.get(ownerId) : undefined;
                console.log(`Joiner ${id} disconnected from room ${code}`);
                if (ownerSocket && ownerSocket.readyState === ws_1.WebSocket.OPEN) {
                    ownerSocket.send(JSON.stringify({
                        type: "join-disconnect",
                        userId: id,
                        code,
                        message: "Joiner disconnected during joining"
                    }));
                }
                // clean up
                joiningState.delete(code);
            }
        }
        roomClients.delete(id);
        break;
    }
};
exports.removeRoomClient = removeRoomClient;
const handleRoomMessage = (ws, data) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const msg = JSON.parse(data);
        const { type, userId, code, status } = msg;
        if (!userId || !code || !status) {
            ws.send(JSON.stringify({ error: 'Missing fields: userId, code, or status' }));
            return;
        }
        if (status == 'joining') {
            const ownerId = roomMap.get(code);
            const ownerSocket = ownerId ? roomClients.get(ownerId) : undefined;
            if (!ownerId) {
                ws.send(JSON.stringify({ error: `Room ${code} not found` }));
                return;
            }
            joiningState.set(code, userId); // store joiner
            if (ownerSocket && ownerSocket.readyState === ws_1.WebSocket.OPEN) {
                console.log(`User ${userId} joining room ${code}, notifying owner ${ownerId}`);
                ownerSocket.send(JSON.stringify({ type: 'join-request', userId: userId, code: code, status: 'joining' }));
            }
            else {
                ws.send(JSON.stringify({ error: 'Invalid code or owner not connected' }));
            }
        }
        else if (status == 'success') {
            const ownerId = roomMap.get(code);
            if (!ownerId) {
                ws.send(JSON.stringify({ error: 'Invalid room code' }));
                return;
            }
            // Find the joining user (anyone who isn't the owner)
            const joinerEntry = Array.from(roomClients.entries())
                .find(([id]) => id !== ownerId && roomMap.get(code) === ownerId);
            if (!joinerEntry) {
                ws.send(JSON.stringify({ error: 'Joiner not connected' }));
                return;
            }
            const [joinerId, joinerSocket] = joinerEntry;
            if (joinerSocket && joinerSocket.readyState === ws_1.WebSocket.OPEN) {
                finalAckState.set(code, {
                    ownerAck: false,
                    joinerAck: false
                });
                console.log(`Owner ${ownerId} confirmed success for code ${code}`);
                joinerSocket.send(JSON.stringify({ type: 'join-success', userId: ownerId, code, status: 'success' }));
                // Create room & update user codes in DB
                yield RoomController_1.default.createRoomAndAssignCode(ownerId, joinerId, code);
                // Notify both clients
                const finalMsgToOwner = JSON.stringify({
                    type: 'final',
                    userId: joinerId,
                    code: code,
                    message: 'Room created successfully'
                });
                const finalMsgToJoiner = JSON.stringify({
                    type: 'final',
                    userId: ownerId,
                    code: code,
                    message: 'Room created successfully'
                });
                ws.send(finalMsgToOwner);
                joinerSocket.send(finalMsgToJoiner);
            }
            else {
                ws.send(JSON.stringify({ error: 'Joiner not connected' }));
            }
        }
        else if (status == 'final-ack') {
            const ownerId = roomMap.get(code);
            const joinerId = joiningState.get(code);
            if (!ownerId || !joinerId)
                return;
            const ackState = finalAckState.get(code);
            if (!ackState)
                return;
            const ownerSocket = roomClients.get(ownerId);
            const joinerSocket = roomClients.get(joinerId);
            console.log(`Final-ack from ${userId} for room ${code}`);
            // 🔹 OWNER ACK
            if (userId === ownerId && !ackState.ownerAck) {
                ackState.ownerAck = true;
                if ((ownerSocket === null || ownerSocket === void 0 ? void 0 : ownerSocket.readyState) === ws_1.WebSocket.OPEN) {
                    setTimeout(() => {
                        ownerSocket.close(1000, 'Final ack complete');
                        roomClients.delete(ownerId);
                    }, 300);
                }
            }
            // 🔹 JOINER ACK
            if (userId === joinerId && !ackState.joinerAck) {
                ackState.joinerAck = true;
                if ((joinerSocket === null || joinerSocket === void 0 ? void 0 : joinerSocket.readyState) === ws_1.WebSocket.OPEN) {
                    setTimeout(() => {
                        joinerSocket.close(1000, 'Final ack complete');
                        roomClients.delete(joinerId);
                    }, 300);
                }
            }
            console.log(`Final-ack from ${userId} for room ${code}`);
            // If first ack → start timer
            if (!ackState.timer) {
                ackState.timer = setTimeout(() => __awaiter(void 0, void 0, void 0, function* () {
                    console.log(`Final-ack timeout for room ${code}`);
                    // ❌ both did NOT ack
                    if (!(ackState.ownerAck && ackState.joinerAck)) {
                        // Notify connected user
                        const ownerSocket = roomClients.get(ownerId);
                        const joinerSocket = roomClients.get(joinerId);
                        if ((ownerSocket === null || ownerSocket === void 0 ? void 0 : ownerSocket.readyState) === ws_1.WebSocket.OPEN) {
                            ownerSocket.send(JSON.stringify({
                                type: 'room-expired',
                                message: 'You did not confirm in time'
                            }));
                        }
                        if ((joinerSocket === null || joinerSocket === void 0 ? void 0 : joinerSocket.readyState) === ws_1.WebSocket.OPEN) {
                            joinerSocket.send(JSON.stringify({
                                type: 'room-expired',
                                message: 'You did not confirm in time'
                            }));
                        }
                        // Send FCM to the user who ACKed but disconnected
                        if (ackState.ownerAck && !ownerSocket) {
                            yield (0, NotificationService_1.sendNotificationToUser)(String(ownerId), {
                                status: "failed",
                                timestamp: String(Date.now()),
                                receiverId: String(ownerId),
                                senderId: String(joinerId),
                                type: 'room'
                            });
                        }
                        if (ackState.joinerAck && !joinerSocket) {
                            yield (0, NotificationService_1.sendNotificationToUser)(String(joinerId), {
                                status: "failed",
                                timestamp: String(Date.now()),
                                receiverId: String(joinerId),
                                senderId: String(ownerId),
                                type: 'room'
                            });
                        }
                    }
                    // Cleanup and disconnect
                    finalAckState.delete(code);
                    joiningState.delete(code);
                    roomMap.delete(code);
                    roomClients.delete(ownerId);
                    roomClients.delete(joinerId);
                    yield RoomController_1.default.deleteRoomAndClearCode(code);
                }), 10000);
            }
            // ✅ If both ACK before timeout
            if (ackState.ownerAck && ackState.joinerAck) {
                console.log(`Both final-ack received for ${code}`);
                clearTimeout(ackState.timer);
                yield Promise.all([
                    (0, NotificationService_1.sendNotificationToUser)(String(joinerId), {
                        status: "success",
                        timestamp: String(Date.now()),
                        receiverId: String(joinerId),
                        senderId: String(ownerId),
                        type: 'room'
                    }),
                    (0, NotificationService_1.sendNotificationToUser)(String(ownerId), {
                        status: "success",
                        timestamp: String(Date.now()),
                        receiverId: String(ownerId),
                        senderId: String(joinerId),
                        type: 'room'
                    })
                ]);
                finalAckState.delete(code);
                joiningState.delete(code);
                roomMap.delete(code);
                roomClients.delete(ownerId);
                roomClients.delete(joinerId);
            }
        }
        else {
            ws.send(JSON.stringify({ error: 'Invalid status' }));
        }
    }
    catch (error) {
        console.error('Invalid JSON received:', data);
        ws.send(JSON.stringify({ error: 'Invalid JSON format' }));
    }
});
exports.handleRoomMessage = handleRoomMessage;
