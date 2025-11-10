import { WebSocket } from 'ws'

// Connected clients: userId → socket
const roomClients = new Map<number, WebSocket>()
// Room map: code → owner userId
const roomMap = new Map<number, number>()

export const setRoomClient = (userId: number, ws: WebSocket) => {
    roomClients.set(userId, ws)
}

export const removeRoomClient = (ws: WebSocket) => {
    for (const [id, socket] of roomClients.entries()) {
        if (socket === ws) {
            roomClients.delete(id)
            // Remove any room owned by this user
            for (const [code, ownerId] of roomMap.entries()) {
                if (ownerId === id) {
                    roomMap.delete(code)
                    console.log(`Deleted room ${code} (owner disconnected)`)
                }
            }
            break
        }
    }
}

export const handleRoomMessage = async (ws: WebSocket, data: string) => {
    try {
        const msg = JSON.parse(data)
        const { userId, code, status } = msg

        if (!userId || !code || !status) {
            ws.send(JSON.stringify({ error: 'Missing fields: userId, code, or status' }))
            return
        }

        switch (status) {
            case 'create': {
                roomMap.set(code, userId)
                ws.send(JSON.stringify({ type: 'room_created', code }))
                console.log(`Room ${code} created by user ${userId}`)
                break
            }

            case 'joining': {
                const ownerId = roomMap.get(code)
                const ownerSocket = ownerId ? roomClients.get(ownerId) : undefined

                if (ownerSocket && ownerSocket.readyState === WebSocket.OPEN) {
                    console.log(`User ${userId} joining room ${code}, notifying owner ${ownerId}`)
                    ownerSocket.send(JSON.stringify({ type: 'join_request', userId, code }))
                } else {
                    ws.send(JSON.stringify({ error: 'Invalid code or owner not connected' }))
                }
                break
            }

            case 'success': {
                const ownerId = roomMap.get(code)
                if (!ownerId) {
                    ws.send(JSON.stringify({ error: 'Invalid room code' }))
                    return
                }

                // Find the joining user (anyone who isn't the owner)
                const joinerSocket = Array.from(roomClients.entries())
                    .find(([id]) => id !== ownerId)?.[1]

                if (joinerSocket && joinerSocket.readyState === WebSocket.OPEN) {
                    console.log(`Owner ${ownerId} confirmed success for code ${code}`)
                    joinerSocket.send(JSON.stringify({ type: 'room_joined', code, status: 'success' }))
                    ws.send(JSON.stringify({ type: 'ack', code, status: 'success' }))
                } else {
                    ws.send(JSON.stringify({ error: 'Joiner not connected' }))
                }
                break
            }

            default:
                ws.send(JSON.stringify({ error: `Invalid status: ${status}` }))
        }
    } catch (error) {
        console.error('Invalid JSON received:', data)
        ws.send(JSON.stringify({ error: 'Invalid JSON format' }))
    }
}