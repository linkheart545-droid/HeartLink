import { WebSocketServer, WebSocket } from 'ws'
import http from 'http'
import { parse } from 'url'
import { setClientSocket, removeClientSocket, handleMessage } from './moodHandler'

export const setupMoodSocket = (server: http.Server) => {
    const wssMood = new WebSocketServer({ noServer: true })

    server.on('upgrade', (req, socket, head) => {
        const pathname = new URL(req.url!, `http://${req.headers.host}`).pathname

        if (pathname === '/mood') {
            wssMood.handleUpgrade(req, socket, head, (ws) => {
                wssMood.emit('connection', ws, req)
            })
        }
    })

    wssMood.on('connection', (ws: WebSocket, req) => {
        console.log('Client connected to /mood')

        const { query } = parse(req.url!, true)
        const userId = parseInt(query.userId as string)

        if (userId && !isNaN(userId)) {
            setClientSocket(userId, ws)
            console.log(`Client registered with userId: ${userId}`)
        } else {
            console.log('Client connected without valid userId')
        }

        ws.on('message', (data) => {
            try {
                const parsed = JSON.parse(data.toString())
                if (!userId || !parsed.senderId || userId !== parsed.senderId) {
                    ws.send(JSON.stringify({ error: 'Invalid or mismatched senderId' }))
                    return
                }
                handleMessage(ws, data.toString())
            } catch {
                ws.send(JSON.stringify({ error: 'Invalid JSON format' }))
            }
        })

        ws.on('close', () => {
            console.log(`Client ${userId} disconnected from /mood`)
            removeClientSocket(ws)
        })

        ws.on('error', (err) => {
            console.log('WebSocket Error:', err)
        })
    })
}