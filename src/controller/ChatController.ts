import {Request, Response} from "express"
import {Chat} from "../model/Chat"
import router from "../routes/FcmRoutes";
import {GetObjectCommand, PutObjectCommand} from "@aws-sdk/client-s3";
import client from "../util/s3Client";
import crypto from "crypto";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";

const randomImageName = () => crypto.randomBytes(32).toString('hex')

const getChat = async (req: Request, res: Response) => {
    const code = req.params.code

    const chats = await Chat.find({code: code})

    if (!chats) {
        res.status(404).json({message: "No chats found"})
        return
    }

    for (const chat of chats) {
        if (chat.attachment && chat.attachment.length > 0) {
            const getObjectParams = {
                Bucket: process.env.BUCKET_NAME!!,
                Key: chat.attachment
            }

            const command = new GetObjectCommand(getObjectParams)
            chat.attachment = await getSignedUrl(client, command, {expiresIn: 3600})
        }
    }

    res.status(200).json(chats)
}

const sendAttachment = async (req: Request, res: Response) => {
    if (!req.file) {
        res.status(404).json({message: "No file uploaded"})
        return
    }

    try {
        const imageName = randomImageName()
        const params = {
            Bucket: process.env.BUCKET_NAME!!,
            Key: imageName,
            Body: req.file!!.buffer,
            ContentType: req.file!!.mimetype
        }

        const command = new PutObjectCommand(params)
        await client.send(command)

        res.status(200).json({imageName})
    } catch (error: any) {
        console.log("Failed to upload image. Error : " + error.message)
        res.status(500).json({
            message: error.message
        })
    }
}

export default {
    getChat,
    sendAttachment
}
