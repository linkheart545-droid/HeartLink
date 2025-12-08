import {WebSocket} from 'ws'
import {Room} from "../model/Room";
import roomController from "../controller/RoomController";

// Connected clients: userId → socket
const roomClients = new Map<number, WebSocket>()
// Room map: code → owner userId
const roomMap = new Map<string, number>()

export const setRoomClient = (userId: number, ws: WebSocket) => {
    roomClients.set(userId, ws)
}

export const setRoomMap = (userId: number, code: string, ws: WebSocket) => {
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

            console.log(`User ${id} disconnected`);

            // Find if this user was an owner of any room
            let disconnectCode: string | null = null;
            let ownerId: number | null = null;

            for (const [code, oId] of roomMap.entries()) {
                if (oId === id) {
                    disconnectCode = code;
                    ownerId = id;
                    break;
                }
            }

            // If they are owner and a joiner was trying to join
            if (disconnectCode && ownerId !== null) {
                console.log(`Owner ${ownerId} disconnected from room ${disconnectCode}`);

                // find joiner: any connected user except owner
                const joinerEntry = Array.from(roomClients.entries())
                    .find(([uid]) => uid !== ownerId);

                if (joinerEntry) {
                    const [joinerId, joinerSocket] = joinerEntry;

                    if (joinerSocket.readyState === WebSocket.OPEN) {
                        joinerSocket.send(JSON.stringify({
                            type: 'join-disconnect',
                            userId: ownerId,
                            code: disconnectCode,
                            message: `Owner with id ${ownerId} disconnected`
                        }))
                    }
                }

                roomMap.delete(disconnectCode);
            }

            // If this user is a joiner trying to join an owner
            for (const [code, owner] of roomMap.entries()) {
                const ownerSocket = roomClients.get(owner);

                // Joiner disconnect case
                if (owner !== id) {
                    if (ownerSocket && ownerSocket.readyState === WebSocket.OPEN) {
                        ownerSocket.send(JSON.stringify({
                            type: 'join-disconnect',
                            userId: id,
                            code: code,
                            message: `Joiner with id ${id} disconnected`
                        }))
                    }
                }
            }

            // Remove user from connection map
            roomClients.delete(id);

            break;
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
                joinerSocket.send(JSON.stringify({ type: 'join-success', userId: ownerId, code, status: 'success' }))

                // Create room & update user codes in DB
                await roomController.createRoomAndAssignCode(ownerId, joinerId, code)

                // Notify both clients
                const finalMsgToOwner = JSON.stringify({ type: 'final', userId: joinerId, code: code, message: 'Room created successfully' })
                const finalMsgToJoiner = JSON.stringify({ type: 'final', userId: ownerId, code: code, message: 'Room created successfully' })
                ws.send(finalMsgToOwner)
                joinerSocket.send(finalMsgToJoiner)

                // Cleanup and disconnect
                roomClients.delete(ownerId)
                roomClients.delete(joinerId)
                roomMap.delete(code)

                setTimeout(() => {
                    try {
                        ws.close(1000, 'Room creation complete')
                        joinerSocket.close(1000, 'Room creation complete')
                    } catch (err) {
                        console.error('Error closing sockets:', err)
                    }
                }, 300)
            } else {
                ws.send(JSON.stringify({ error: 'Joiner not connected' }))
            }
        } else {
            ws.send(JSON.stringify({error: 'Invalid status'}))
        }
    } catch (error) {
        console.error('Invalid JSON received:', data)
        ws.send(JSON.stringify({error: 'Invalid JSON format'}))
    }
}