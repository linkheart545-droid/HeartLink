// src/util/fcmService.ts
import { getMessaging } from './setupFirebase';
import type admin from 'firebase-admin';
import { FcmToken } from '../model/FcmToken';

export interface PushPayload {
    title: string
    body: string
    imageUrl?: string
    moodId: string,
    senderId: string,
    receiverId: string,
}

export async function sendPushToTokens(
    tokens: string[],
    payload: PushPayload
): Promise<admin.messaging.BatchResponse> {
    if (tokens.length === 0) {
        console.log('No tokens to send')
        // @ts-expect-error: we return early, so caller should handle this case
        return
    }

    const messaging = getMessaging();

    const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
            title: payload.title,
            body: payload.body,
            imageUrl: payload.imageUrl,
        },
        data: {
            moodId: payload.moodId,
            receiverId: payload.receiverId,
            senderId: payload.senderId
        },
        android: {
            priority: 'high',
            notification: {
                sound: 'default',
                channelId: 'default',
            },
        },
    };

    const response = await messaging.sendEachForMulticast(message);
    console.log(
        'Multicast send result:',
        response.successCount,
        'success,',
        response.failureCount,
        'failed'
    );

    // Clean up invalid tokens
    const tokensToDelete: string[] = [];

    response.responses.forEach((resp, idx) => {
        if (!resp.success) {
            const error = resp.error;
            console.error('Error sending to token:', tokens[idx], error?.code);

            // These are common error codes for invalid / unregistered tokens
            if (
                error &&
                [
                    'messaging/invalid-registration-token',
                    'messaging/registration-token-not-registered',
                ].includes(error.code)
            ) {
                tokensToDelete.push(tokens[idx]);
            }
        }
    });

    if (tokensToDelete.length > 0) {
        console.log('Deleting invalid tokens:', tokensToDelete);

        await FcmToken.deleteMany({
            token: { $in: tokensToDelete },
        });
    }

    return response;
}
