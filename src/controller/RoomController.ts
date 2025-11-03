import {Request, Response} from "express"
import {randomInt} from "node:crypto";
import {Room} from "../model/Room";

const randomCodeGenerator = randomInt(0,100000)

const generateCode = async (req: Request, res: Response) => {
    try {
        const userId = req.params.userId

        let code = randomCodeGenerator
        let exists = await Room.exists({code : code })

        while (exists) {
            code = randomCodeGenerator
            exists = await Room.exists({code : code})
        }

        const room = new Room({
            code : code,
            userId1 : userId,
            userId2 : 0,
        })

        const savedRoom = await room.save()
        res.status(201).json({room: savedRoom})
    } catch (error: any) {
        res.status(500).json({error: error.message})
    }
}

const updateCode = async (req: Request, res: Response) => {
    try {
        const userId = req.params.userId

        let code = randomCodeGenerator
        let exists = await Room.exists({code : code })

        while (exists) {
            code = randomCodeGenerator
            exists = await Room.exists({code : code})
        }

        const room = new Room({
            code : code,
            userId1 : userId,
            userId2 : 0,
        })

        const savedRoom = await room.save()
        res.status(201).json({room: savedRoom})
    } catch (error: any) {
        res.status(500).json({error: error.message})
    }
}

export default {
    generateCode,
    updateCode
}