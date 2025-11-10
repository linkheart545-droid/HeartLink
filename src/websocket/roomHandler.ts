import {WebSocket} from 'ws'
import {Room} from "../model/Room";

// Connected clients: userId → socket
const roomClients = new Map<number, WebSocket>()
// Room map: code → owner userId
const roomMap = new Map<number, number>()

export const setRoomClient = (userId: number, ws: WebSocket) => {
    roomClients.set(userId, ws)
}

export const setRoomMap = (userId: number, code: number, ws: WebSocket) => {
    if (roomMap.has(code)) {
        const existingOwner = roomMap.get(code)
        if (existingOwner === userId) {
            // same owner reconnecting, you might allow it (optional)
            console.log(`User ${userId} reconnected to existing room ${code}`)
        } else {
            // another user trying to take an already owned code
            ws.send(JSON.stringify({
                error: `Room code ${code} already in use by another user (${existingOwner})`
            }))
            ws.close(1008, 'Room code already in use') // 1008 = policy violation
            console.log(`Rejected user ${userId} for duplicate room code ${code}`)
            return
        }
    } else {
        roomMap.set(code, userId)
        console.log(`Created new room ${code} for user ${userId}`)
    }
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
        const {type, userId, code, status} = msg

        if (!userId || !code || !status) {
            ws.send(JSON.stringify({error: 'Missing fields: userId, code, or status'}))
            return
        }

        if (status == 'joining') {
            const ownerId = roomMap.get(code)
            const ownerSocket = ownerId ? roomClients.get(ownerId) : undefined

            if (!ownerId) {
                ws.send(JSON.stringify({error: `Room ${code} not found`}))
                return
            }

            if (ownerSocket && ownerSocket.readyState === WebSocket.OPEN) {
                console.log(`User ${userId} joining room ${code}, notifying owner ${ownerId}`)
                ownerSocket.send(JSON.stringify({type: 'join-request', userId: userId, code: code, status: 'joining'}))
            } else {
                ws.send(JSON.stringify({error: 'Invalid code or owner not connected'}))
            }
        } else if (status == 'success') {
            const ownerId = roomMap.get(code)
            if (!ownerId) {
                ws.send(JSON.stringify({error: 'Invalid room code'}))
                return
            }

            // Find the joining user (anyone who isn't the owner)
            const joinerEntry = Array.from(roomClients.entries())
                .find(([id]) => id !== ownerId && roomMap.get(code) === ownerId)

            if (!joinerEntry) {
                ws.send(JSON.stringify({error: 'Joiner not connected'}))
                return
            }

            const [joinerId, joinerSocket] = joinerEntry

            if (joinerSocket && joinerSocket.readyState === WebSocket.OPEN) {
                console.log(`Owner ${ownerId} confirmed success for code ${code}`)
                joinerSocket.send(JSON.stringify({type: 'join-success', userId: ownerId, code: code, status: 'success'}))
                ws.send(JSON.stringify({type: 'ack', userId: ownerId, code: code, status: 'success'}))
                console.log(`Owner ${ownerId} got ack for successful join of user ${userId} for code ${code}`)

                // After both got success , add the room in database
                const room = new Room({
                    userId1: ownerId,
                    userId2: joinerId,
                    code: code
                })
                await room.save()

            } else {
                ws.send(JSON.stringify({error: 'Joiner not connected'}))
            }
        } else {
            ws.send(JSON.stringify({error: 'Invalid status'}))
        }
    } catch (error) {
        console.error('Invalid JSON received:', data)
        ws.send(JSON.stringify({error: 'Invalid JSON format'}))
    }
}