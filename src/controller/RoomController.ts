import {Request, Response} from "express"
import {randomInt} from "node:crypto";
import {Room} from "../model/Room";
import {User} from "../model/User";
import mongoose from "mongoose";

const generateCode = async (req: Request, res: Response) => {
    try {
        let code = randomInt(0,100000)
        let codeExists = await Room.exists({code : code.toString() })

        while (codeExists) {
            code = randomInt(0,100000)
            codeExists = await Room.exists({code : code.toString()})
        }

        res.status(200).json({code: code.toString()})
    } catch (error: any) {
        res.status(500).json({message: "Unable to generate code",error: error.message})
    }
}

const createRoomAndAssignCode = async (ownerId: number, joinerId: number, code: string) => {
    const session = await mongoose.startSession()
    session.startTransaction()
    try {
        const exists = await Room.exists({code: code})
        if (exists) {
            console.log(`Room with code ${code} already exists`)
            await session.abortTransaction()
        }

        // Create the room
        const room = new Room({ userId1: ownerId, userId2: joinerId, code })
        await room.save({ session })

        console.log(`Owner : ${ownerId}, Joiner ID : ${joinerId}, Code : ${code}`)

        // Update both users atomically
        await User.updateMany(
            { id: { $in: [ownerId, joinerId] } },
            { $set: { code } },
            { session }
        )

        await session.commitTransaction()
        console.log(`Room ${code} created and users updated successfully`)
        return room
    } catch (err) {
        await session.abortTransaction()
        console.error('Failed to create room or update users:', err)
        throw err
    } finally {
        await session.endSession()
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
    createRoomAndAssignCode,
    leaveRoom
}