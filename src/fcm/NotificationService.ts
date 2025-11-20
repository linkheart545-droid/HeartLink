import { FcmToken } from '../model/FcmToken';
import { PushPayload, sendPushToToken} from './FcmService'

export async function sendNotificationToUser(
    userId: string,
    payload: PushPayload
) {
    const tokenWrapper = await FcmToken.findOne({ userId });

    if (!tokenWrapper || !tokenWrapper.token) {
        console.log('No token for user', userId);
        throw new Error('No FCM token for user');
    }

    return sendPushToToken(tokenWrapper.token, payload);
}