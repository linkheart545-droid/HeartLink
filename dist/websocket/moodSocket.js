"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupMoodSocket = void 0;
const ws_1 = require("ws");
const url_1 = require("url");
const moodHandler_1 = require("./moodHandler");
const setupMoodSocket = (server) => {
    const wssMood = new ws_1.WebSocketServer({ noServer: true });
    server.on('upgrade', (req, socket, head) => {
        const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
        if (pathname === '/mood') {
            wssMood.handleUpgrade(req, socket, head, (ws) => {
                wssMood.emit('connection', ws, req);
            });
        }
    });
    wssMood.on('connection', (ws, req) => {
        console.log('Client connected to /mood');
        const { query } = (0, url_1.parse)(req.url, true);
        const userId = parseInt(query.userId);
        if (userId && !isNaN(userId)) {
            (0, moodHandler_1.setClientSocket)(userId, ws);
            console.log(`Client registered with userId: ${userId}`);
        }
        else {
            console.log('Client connected without valid userId');
        }
        ws.on('message', (data) => {
            try {
                const parsed = JSON.parse(data.toString());
                if (!userId || !parsed.senderId || userId !== parsed.senderId) {
                    ws.send(JSON.stringify({ error: 'Invalid or mismatched senderId' }));
                    return;
                }
                (0, moodHandler_1.handleMessage)(ws, data.toString());
            }
            catch (_a) {
                ws.send(JSON.stringify({ error: 'Invalid JSON format' }));
            }
        });
        ws.on('close', () => {
            console.log(`Client ${userId} disconnected from /mood`);
            (0, moodHandler_1.removeClientSocket)(ws);
        });
        ws.on('error', (err) => {
            console.log('WebSocket Error:', err);
        });
    });
};
exports.setupMoodSocket = setupMoodSocket;
