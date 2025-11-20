// src/util/fcmService.ts
import {getMessaging} from './setupFirebase';
import type admin from 'firebase-admin';
import {FcmToken} from '../model/FcmToken';

export interface PushPayload {
    moodId: string;
    senderId: string;
    receiverId: string;
    timestamp: string;
}

export async function sendPushToToken(
    token: string,
    payload: PushPayload
): Promise<string> {
    if (!token) {
        console.log('No token provided');
        throw new Error('No token provided');
    }

    const messaging = getMessaging();

    const message: admin.messaging.Message = {
        token,
        data: {
            moodId: String(payload.moodId ?? ''),
            receiverId: String(payload.receiverId ?? ''),
            senderId: String(payload.senderId ?? ''),
            timestamp: String(payload.timestamp ?? ''),
        },
        android: {
            priority: 'high',
        },
    };

    try {
        const messageId = await messaging.send(message);
        console.log('Unicast send result: success, messageId:', messageId);
        return messageId;
    } catch (error: any) {
        console.error('Error sending to token:', token, error?.code || error?.message);

        if (
            error &&
            [
                'messaging/invalid-registration-token',
                'messaging/registration-token-not-registered',
            ].includes(error.code)
        ) {
            console.log('Deleting invalid token:', token);
            await FcmToken.deleteMany({ token });
        }

        // IMPORTANT: rethrow so caller knows it failed
        throw error;
    }
}
