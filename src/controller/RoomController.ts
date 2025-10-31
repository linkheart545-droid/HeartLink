import {Request, Response} from "express"
import {User} from "../model/User"
import {DeleteObjectCommand, GetObjectCommand, PutObjectCommand} from "@aws-sdk/client-s3"
import crypto from 'crypto'
import {getSignedUrl} from "@aws-sdk/s3-request-presigner"
import client from "../util/s3Client"
import {randomInt} from "node:crypto";
import {Room} from "../model/Room";
import RoomRoutes from "../routes/RoomRoutes";

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

}

export default {
    generateCode,
    updateCode
}