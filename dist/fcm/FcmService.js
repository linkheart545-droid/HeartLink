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
exports.sendPushToToken = sendPushToToken;
// src/util/fcmService.ts
const setupFirebase_1 = require("./setupFirebase");
const FcmToken_1 = require("../model/FcmToken");
function sendPushToToken(token, payload) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        if (!token) {
            console.log('No token provided');
            throw new Error('No token provided');
        }
        const messaging = (0, setupFirebase_1.getMessaging)();
        let data = {};
        if (payload.type === 'mood') {
            data = {
                type: 'mood',
                moodId: String((_a = payload.moodId) !== null && _a !== void 0 ? _a : ''),
                receiverId: String((_b = payload.receiverId) !== null && _b !== void 0 ? _b : ''),
                senderId: String((_c = payload.senderId) !== null && _c !== void 0 ? _c : ''),
                timestamp: String((_d = payload.timestamp) !== null && _d !== void 0 ? _d : ''),
            };
        }
        else if (payload.type === 'chat') {
            data = {
                type: 'chat',
                receiverId: String((_e = payload.receiverId) !== null && _e !== void 0 ? _e : ''),
                senderId: String((_f = payload.senderId) !== null && _f !== void 0 ? _f : ''),
                timestamp: String((_g = payload.timestamp) !== null && _g !== void 0 ? _g : ''),
                message: String((_h = payload.message) !== null && _h !== void 0 ? _h : ''),
                attachment: String((_j = payload.attachment) !== null && _j !== void 0 ? _j : ''),
            };
        }
        else if (payload.type === 'leave') {
            data = {
                type: 'leave',
                receiverId: String((_k = payload.receiverId) !== null && _k !== void 0 ? _k : ''),
                senderId: String((_l = payload.senderId) !== null && _l !== void 0 ? _l : ''),
                timestamp: String((_m = payload.timestamp) !== null && _m !== void 0 ? _m : '')
            };
        }
        else {
            throw new Error('Unknown message type provided');
        }
        const message = {
            token,
            data,
            android: {
                priority: 'high',
            },
        };
        console.log(`Data: ${JSON.stringify(data, null, 2)}`);
        try {
            const messageId = yield messaging.send(message);
            console.log(`${payload.type} send result: success, messageId:`, messageId);
            return messageId;
        }
        catch (error) {
            console.error(`Error sending ${payload.type} to token:`, token, (error === null || error === void 0 ? void 0 : error.code) || (error === null || error === void 0 ? void 0 : error.message));
            if (error &&
                [
                    'messaging/invalid-registration-token',
                    'messaging/registration-token-not-registered',
                ].includes(error.code)) {
                console.log('Deleting invalid token:', token);
                yield FcmToken_1.FcmToken.deleteMany({ token });
            }
            throw error;
        }
    });
}
