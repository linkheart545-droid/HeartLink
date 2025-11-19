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
exports.sendPushToTokens = sendPushToTokens;
// src/util/fcmService.ts
const setupFirebase_1 = require("./setupFirebase");
const FcmToken_1 = require("../model/FcmToken");
function sendPushToTokens(tokens, payload) {
    return __awaiter(this, void 0, void 0, function* () {
        if (tokens.length === 0) {
            console.log('No tokens to send');
            // @ts-expect-error: we return early, so caller should handle this case
            return;
        }
        const messaging = (0, setupFirebase_1.getMessaging)();
        const message = {
            tokens,
            data: {
                moodId: payload.moodId,
                receiverId: payload.receiverId,
                senderId: payload.senderId,
                timestamp: Date.now().toString(),
            },
            android: {
                priority: 'high', // Keep this for reliable delivery
            },
        };
        const response = yield messaging.sendEachForMulticast(message);
        console.log('Multicast send result:', response.successCount, 'success,', response.failureCount, 'failed');
        // Clean up invalid tokens
        const tokensToDelete = [];
        response.responses.forEach((resp, idx) => {
            if (!resp.success) {
                const error = resp.error;
                console.error('Error sending to token:', tokens[idx], error === null || error === void 0 ? void 0 : error.code);
                // These are common error codes for invalid / unregistered tokens
                if (error &&
                    [
                        'messaging/invalid-registration-token',
                        'messaging/registration-token-not-registered',
                    ].includes(error.code)) {
                    tokensToDelete.push(tokens[idx]);
                }
            }
        });
        if (tokensToDelete.length > 0) {
            console.log('Deleting invalid tokens:', tokensToDelete);
            yield FcmToken_1.FcmToken.deleteMany({
                token: { $in: tokensToDelete },
            });
        }
        return response;
    });
}
