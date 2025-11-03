import {WebSocketServer, WebSocket, RawData} from 'ws'
import {setClientSocket, removeClientSocket, handleMessage} from './wshandler'
import http from 'http'
import { parse } from 'url'
import {Room} from "../model/Room";

export const setupWebSocket = (server: http.Server) => {
    const wss = new WebSocketServer({ server })

    wss.on('connection', (ws: WebSocket, req) => {
        console.log('Client connected')

        const { query } = parse(req.url!, true)
        const userId = parseInt(query.userId as string)

        if (userId && !isNaN(userId)) {
            setClientSocket(userId, ws)
            console.log(`Client registered with userId: ${userId}`)
        } else {
            console.log('Client connected without valid userId')
        }

        ws.on('message', (data: RawData) => {
            try {
                const parsed = JSON.parse(data.toString())

                // Validate sender ID matches connection ID
                if (!userId || !parsed.senderId || userId !== parsed.senderId) {
                    ws.send(JSON.stringify({ error: 'Invalid or mismatched senderId in message' }))
                    return
                }

                // Handle the message
                handleMessage(ws, data.toString())
            } catch (err) {
                ws.send(JSON.stringify({ error: 'Invalid JSON format' }))
            }
        })

        ws.on('error', (err) => {
            console.log('WebSocket Error:', err)
        })

        ws.on('close', () => {
            console.log('Client disconnected')
            removeClientSocket(ws)
        })
    })
}