import {Request, Response} from "express"
import {randomInt} from "node:crypto";
import {Room} from "../model/Room";
import {User} from "../model/User";

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
        res.status(500).json({message: "Unable to generate code",error: error.message})
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

        if (room.userId1 == userId) {
            res.status(409).json({message: "Can not join your own room"})
            return
        }

        const alreadyJoined = await Room.findOne({userId2 : userId})

        if (alreadyJoined) {
            res.status(409).json({message: 'Already joined a room'})
            return
        }

        room.userId2 = userId

        const savedRoom = await room.save()

        await User.updateMany(
            { id: { $in: [savedRoom.userId1, savedRoom.userId2] } },
            { $set: { code: code } }
        )

        res.status(200).json({room: savedRoom})
    } catch (error: any) {
        res.status(500).json({message: "Unable to join room",error: error.message})
    }
}

const leaveRoom = async (req: Request, res: Response) => {
    try {
        const {code} = req.body

        const room = await Room.findOne({code : code})

        if (!room) {
            res.status(404).json({error: "Room not found"})
            return
        }

        await User.updateMany(
            { id: { $in: [room.userId1, room.userId2] } },
            { $set: { code: "" } }
        )

        await room.deleteOne()

        res.status(200).json({message: 'Room deleted successfully'})
    } catch (error: any) {
        res.status(500).json({message: "Unable to leave room",error: error.message})
    }
}

export default {
    generateCode,
    joinRoom,
    leaveRoom
}