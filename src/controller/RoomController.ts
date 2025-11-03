import {Request, Response} from "express"
import {randomInt} from "node:crypto";
import {Room} from "../model/Room";

const randomCodeGenerator = randomInt(0,100000)

const generateCode = async (req: Request, res: Response) => {
    try {
        const userId = req.params.userId

        const room = await Room.findOne({userId1 : userId})

        let code = randomCodeGenerator
        let codeExists = await Room.exists({code : code })

        while (codeExists) {
            code = randomCodeGenerator
            codeExists = await Room.exists({code : code})
        }

        if (room) {
            room.code = code

            const savedRoom = await room.save()
            res.status(200).json({room: savedRoom})
        } else {
            const room = new Room({
                code : code,
                userId1 : userId,
                userId2 : 0,
            })

            const savedRoom = await room.save()
            res.status(201).json({room: savedRoom})
        }
    } catch (error: any) {
        res.status(500).json({error: error.message})
    }
}

const joinRoom = async (req: Request, res: Response) => {
    try {
        const {userId, code} = req.body

        const room = await Room.findOne({code : code})

        if (!room) {
            res.status(404).json({error: "Room not found"})
            return
        }

        room.userId2 = userId

        const savedRoom = await room.save()

        res.status(200).json({room: savedRoom})
    } catch (error: any) {
        res.status(500).json({error: error.message})
    }
}

export default {
    generateCode,
    joinRoom
}