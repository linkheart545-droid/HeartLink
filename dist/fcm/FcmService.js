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
        var _a, _b, _c, _d;
        if (!token) {
            console.log('No token provided');
            throw new Error('No token provided');
        }
        const messaging = (0, setupFirebase_1.getMessaging)();
        const message = {
            token,
            data: {
                moodId: String((_a = payload.moodId) !== null && _a !== void 0 ? _a : ''),
                receiverId: String((_b = payload.receiverId) !== null && _b !== void 0 ? _b : ''),
                senderId: String((_c = payload.senderId) !== null && _c !== void 0 ? _c : ''),
                timestamp: String((_d = payload.timestamp) !== null && _d !== void 0 ? _d : ''),
            },
            android: {
                priority: 'high',
            },
        };
        try {
            const messageId = yield messaging.send(message);
            console.log('Unicast send result: success, messageId:', messageId);
            return messageId;
        }
        catch (error) {
            console.error('Error sending to token:', token, (error === null || error === void 0 ? void 0 : error.code) || (error === null || error === void 0 ? void 0 : error.message));
            if (error &&
                [
                    'messaging/invalid-registration-token',
                    'messaging/registration-token-not-registered',
                ].includes(error.code)) {
                console.log('Deleting invalid token:', token);
                yield FcmToken_1.FcmToken.deleteMany({ token });
            }
            // IMPORTANT: rethrow so caller knows it failed
            throw error;
        }
    });
}
