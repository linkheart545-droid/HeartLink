import {WebSocket} from 'ws'
import {Mood} from "../model/Mood";
import {Room} from "../model/Room";
import {Chat} from "../model/Chat";
import {GetObjectCommand} from "@aws-sdk/client-s3";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";
import client from "../util/s3Client";
import {sendNotificationToUser} from "../fcm/NotificationService";

const clients = new Map<number, WebSocket>() // move this to a shared module if needed

export const setClientSocket = (userId: number, ws: WebSocket) => {
    if (!clients.has(userId)) {
        clients.set(userId, ws)
        console.log(`Registered senderId ${userId}`)
    }
}

export const removeClientSocket = (ws: WebSocket) => {
    for (const [userId, socket] of clients.entries()) {
        if (socket === ws) {
            clients.delete(userId)
            break
        }
    }
}

export const getClientSocket = (userId: number): WebSocket | undefined => {
    return clients.get(userId)
}

export const handleMessage = async (ws: WebSocket, data: string) => {
    try {
        const msg = JSON.parse(data)
        console.log(`Handling message from ${msg.senderId} to ${msg.receiverId}:`, msg)

        const imageName = msg.attachment

        if (imageName && imageName.length != 0) {
            const getObjectParams = {
                Bucket: process.env.BUCKET_NAME!!,
                Key: imageName
            }

            const command = new GetObjectCommand(getObjectParams)
            msg.attachment = await getSignedUrl(client, command, {expiresIn: 3600})
        }

        // Check if the receiver is connected
        const receiverSocket = getClientSocket(msg.receiverId)
        if (receiverSocket && receiverSocket.readyState === WebSocket.OPEN) {
            console.log(`Forwarding message to receiver ${msg.receiverId}`)
            receiverSocket.send(JSON.stringify(msg))
        } else {
            console.log(`Receiver ${msg.receiverId} is not connected or socket not open`)
            await sendNotificationToUser(msg.receiverId, {
                type: 'chat',
                receiverId: String(msg.receiverId),
                senderId: String(msg.senderId),
                timestamp: String(msg.timestamp),
                message: String(msg.message),
                attachment: String(msg.attachment)
            })
        }

        ws.send(JSON.stringify({type: 'Acknowledgment', message: msg}))
        console.log(`Acknowledgment sent to sender ${msg.senderId}`)
    } catch (error: any) {
        console.error('Invalid JSON received:', data)
        ws.send(JSON.stringify({error: 'Invalid message format'}))
    }
}