"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FcmToken = void 0;
const mongoose_1 = require("mongoose");
const fcmTokenSchema = new mongoose_1.Schema({
    userId: { type: Number, unique: true, required: true },
    token: { type: String, required: true, unique: true },
    lastActive: { type: Date, default: Date.now },
});
exports.FcmToken = (0, mongoose_1.model)('FcmToken', fcmTokenSchema, 'fcmTokens');
