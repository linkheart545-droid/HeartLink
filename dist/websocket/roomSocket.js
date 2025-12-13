"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupRoomSocket = void 0;
const ws_1 = require("ws");
const url_1 = require("url");
const roomHandler_1 = require("./roomHandler");
const setupRoomSocket = (server) => {
    const wssRoom = new ws_1.WebSocketServer({ noServer: true });
    server.on('upgrade', (req, socket, head) => {
        const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
        if (pathname === '/room') {
            wssRoom.handleUpgrade(req, socket, head, (ws) => {
                wssRoom.emit('connection', ws, req);
            });
        }
    });
    wssRoom.on('connection', (ws, req) => {
        const { query } = (0, url_1.parse)(req.url, true);
        const userId = parseInt(query.userId);
        const code = query.code;
        if (!userId || isNaN(userId)) {
            ws.send(JSON.stringify({ error: 'Invalid or missing userId' }));
            ws.close();
            return;
        }
        if (!code || code.length === 0) {
            console.log(`Code ${code} is null for user ${userId}`);
        }
        else {
            console.log(`Code ${code} is exist Adding to room for user ${userId}`);
            (0, roomHandler_1.setRoomMap)(userId, code, ws);
        }
        console.log(`User ${userId} connected to /room`);
        (0, roomHandler_1.setRoomClient)(userId, ws);
        ws.on('message', (data) => {
            (0, roomHandler_1.handleRoomMessage)(ws, data.toString());
        });
        ws.on('close', () => {
            console.log(`Client ${userId} disconnected from /room`);
            (0, roomHandler_1.removeRoomClient)(ws);
        });
        ws.on('error', (err) => console.log('WebSocket Error:', err));
    });
};
exports.setupRoomSocket = setupRoomSocket;
