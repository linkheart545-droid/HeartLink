// src/util/fcmService.ts
import {getMessaging} from './setupFirebase';
import type admin from 'firebase-admin';
import {FcmToken} from '../model/FcmToken';

interface Payload {
    type: 'mood' | 'chat'
    senderId: string
    receiverId: string
    timestamp: string
}

export interface MoodPayload extends Payload {
    type: 'mood'
    moodId: string
}

export interface ChatPayload extends Payload {
    type: 'chat'
    message: string
    attachment: string
}

export type PushPayload = MoodPayload | ChatPayload

export async function sendPushToToken(
    token: string,
    payload: PushPayload
): Promise<string> {
    if (!token) {
        console.log('No token provided')
        throw new Error('No token provided')
    }

    const messaging = getMessaging()

    let data: Record<string, string> = {}

    if (payload.type === 'mood') {
        data = {
            type: 'mood',
            moodId: String(payload.moodId ?? ''),
            receiverId: String(payload.receiverId ?? ''),
            senderId: String(payload.senderId ?? ''),
            timestamp: String(payload.timestamp ?? ''),
        }
    } else if (payload.type === 'chat') {
        data = {
            type: 'chat',
            receiverId: String(payload.receiverId ?? ''),
            senderId: String(payload.senderId ?? ''),
            timestamp: String(payload.timestamp ?? ''),
            message: String(payload.message ?? ''),
            attachment: String(payload.attachment ?? ''),
        }
    } else {
        throw new Error('Unknown message type provided')
    }

    const message: admin.messaging.Message = {
        token,
        data,
        android: {
            priority: 'high',
        },
    }

    try {
        const messageId = await messaging.send(message)
        console.log(`${payload.type} send result: success, messageId:`, messageId)
        return messageId
    } catch (error: any) {
        console.error(
            `Error sending ${payload.type} to token:`,
            token,
            error?.code || error?.message
        )

        if (
            error &&
            [
                'messaging/invalid-registration-token',
                'messaging/registration-token-not-registered',
            ].includes(error.code)
        ) {
            console.log('Deleting invalid token:', token)
            await FcmToken.deleteMany({ token })
        }

        throw error
    }
}
