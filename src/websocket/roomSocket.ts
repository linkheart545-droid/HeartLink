import { WebSocketServer, WebSocket } from 'ws'
import http from 'http'
import { parse } from 'url'
import {setRoomClient, removeRoomClient, handleRoomMessage, setRoomMap} from './roomHandler'
import {removeClientSocket} from "./moodHandler";

export const setupRoomSocket = (server: http.Server) => {
    const wssRoom = new WebSocketServer({ noServer: true })

    server.on('upgrade', (req, socket, head) => {
        const pathname = new URL(req.url!, `http://${req.headers.host}`).pathname

        if (pathname === '/room') {
            wssRoom.handleUpgrade(req, socket, head, (ws) => {
                wssRoom.emit('connection', ws, req)
            })
        }
    })

    wssRoom.on('connection', (ws: WebSocket, req) => {
        const { query } = parse(req.url!, true)
        const userId = parseInt(query.userId as string)
        const code = parseInt(query.code as string)

        if (!userId || isNaN(userId)) {
            ws.send(JSON.stringify({ error: 'Invalid or missing userId' }))
            ws.close()
            return
        }

        if (!isNaN(code)) {
            setRoomMap(userId,code,ws)
        }

        console.log(`User ${userId} connected to /room`)
        setRoomClient(userId,ws)

        ws.on('message', (data) => {
            handleRoomMessage(ws, data.toString())
        })

        ws.on('close', () => {
            console.log(`Client ${userId} disconnected from /room`)
            removeRoomClient(ws)
        })

        ws.on('error', (err) => console.log('WebSocket Error:', err))
    })
}