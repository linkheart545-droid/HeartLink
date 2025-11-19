import { FcmToken } from '../model/FcmToken';
import { PushPayload, sendPushToTokens} from './FcmService'

export async function sendNotificationToUser(
    userId: string,
    payload: PushPayload
) {

    const tokens = await FcmToken.find({ userId })
        .distinct('token')
        .exec()

    if (tokens.length === 0) {
        console.log('No tokens for user', userId)
        return
    }

    await sendPushToTokens(tokens, payload)
}