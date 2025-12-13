import {Request, Response} from "express"
import {randomInt} from "node:crypto";
import {Room} from "../model/Room";
import {User} from "../model/User";
import mongoose from "mongoose";
import {sendNotificationToUser} from "../fcm/NotificationService";
import {ifError} from "node:assert";

const generateCode = async (req: Request, res: Response) => {
    try {
        let code = randomInt(0, 100000)
        let codeExists = await Room.exists({code: code.toString()})

        while (codeExists) {
            code = randomInt(0, 100000)
            codeExists = await Room.exists({code: code.toString()})
        }

        res.status(200).json({code: code.toString()})
    } catch (error: any) {
        res.status(500).json({message: "Unable to generate code", error: error.message})
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
            throw new Error(`Room with code ${code} already exists`)
        }

        // Create the room
        const room = new Room({userId1: ownerId, userId2: joinerId, code})
        await room.save({session})

        console.log(`Owner : ${ownerId}, Joiner ID : ${joinerId}, Code : ${code}`)

        // Update both users atomically
        await User.updateMany(
            {id: {$in: [ownerId, joinerId]}},
            {$set: {code}},
            {session}
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
        const {userId, code} = req.body

        const room = await Room.findOne({code: code})

        if (!room) {
            res.status(404).json({error: "Room not found"})
            return
        }

        let partnerId: number
        let senderId: number

        if (room.userId1 == userId) {
            senderId = room.userId1
            partnerId = room.userId2
        } else {
            senderId = room.userId2
            partnerId = room.userId1
        }

        console.log(`Partner Id: ${partnerId}, SenderId: ${senderId}`)

        await User.updateMany(
            {id: {$in: [room.userId1, room.userId2]}},
            {$set: {code: ""}}
        )

        await room.deleteOne()

        await sendNotificationToUser(partnerId.toString(), {
            type: 'leave',
            senderId: String(senderId),
            receiverId: String(partnerId),
            timestamp: String(Date.now())
        })

        res.status(200).json({message: 'Room deleted successfully'})
    } catch (error: any) {
        res.status(500).json({message: "Unable to leave room", error: error.message})
    }
}

const deleteRoomAndClearCode = async (code: string) => {
    const session = await mongoose.startSession()
    session.startTransaction()

    try {
        // Find room first (so we know users)
        const room = await Room.findOne({ code }).session(session)

        if (!room) {
            console.log(`No room found with code ${code}`)
            await session.abortTransaction()
            return
        }

        const { userId1, userId2 } = room

        // Delete room
        await Room.deleteOne({ code }).session(session)

        // Clear code for both users
        await User.updateMany(
            { id: { $in: [userId1, userId2] } },
            { $set: { code: "" } },
            { session }
        )

        await session.commitTransaction()
        console.log(`Room ${code} deleted and users cleared successfully`)
    } catch (err) {
        await session.abortTransaction()
        console.error(`Failed to delete room ${code}:`, err)
        throw err
    } finally {
        await session.endSession()
    }
}

export default {
    generateCode,
    createRoomAndAssignCode,
    leaveRoom,
    deleteRoomAndClearCode
}