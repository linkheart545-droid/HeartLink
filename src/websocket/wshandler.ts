import { WebSocket } from 'ws'

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

        // Check if the receiver is connected
        const receiverSocket = getClientSocket(msg.receiverId)
        if (receiverSocket && receiverSocket.readyState === WebSocket.OPEN) {
            console.log(`Forwarding message to receiver ${msg.receiverId}`)
            receiverSocket.send(JSON.stringify(msg))
        } else {
            console.log(`Receiver ${msg.receiverId} is not connected or socket not open`)
        }

        // (Optional) Acknowledge to sender
        ws.send(JSON.stringify(msg))
        console.log(`Acknowledgment sent to sender ${msg.senderId}`)
    } catch (error: any) {
        console.error('Invalid JSON received:', data)
        ws.send(JSON.stringify({ error: 'Invalid message format' }))
    }
}