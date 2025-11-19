import {Schema, model, Document} from 'mongoose';

export interface FcmToken extends Document {
    userId: number,
    token: string,
    lastActive: Date
}

const fcmTokenSchema = new Schema<FcmToken>({
    userId: {type: Number, unique: true, required: true},
    token: {type: String, required: true, unique: true},
    lastActive: {type: Date, default: Date.now},
})

export const FcmToken = model('FcmToken', fcmTokenSchema, 'fcmTokens');