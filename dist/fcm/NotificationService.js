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
exports.sendNotificationToUser = sendNotificationToUser;
const FcmToken_1 = require("../model/FcmToken");
const FcmService_1 = require("./FcmService");
function sendNotificationToUser(userId, payload) {
    return __awaiter(this, void 0, void 0, function* () {
        const tokens = yield FcmToken_1.FcmToken.find({ userId })
            .distinct('token')
            .exec();
        if (tokens.length === 0) {
            console.log('No tokens for user', userId);
            return;
        }
        yield (0, FcmService_1.sendPushToTokens)(tokens, payload);
    });
}
