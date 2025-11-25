import {Request, Response} from "express"
import {Chat} from "../model/Chat"
import router from "../routes/FcmRoutes";
import {GetObjectCommand, PutObjectCommand} from "@aws-sdk/client-s3";
import client from "../util/s3Client";
import crypto from "crypto";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";

const randomImageName = () => crypto.randomBytes(32).toString('hex')

const exportChat = async (req: Request, res: Response) => {
    if (!req.file) {
        res.status(404).send("No file found")
        return
    }

    try {
        const fileName = req.body.fileName
        const params = {
            Bucket: process.env.BUCKET_NAME!!,
            Key: fileName,
            Body: req.file!!.buffer,
            ContentType: req.file!!.mimetype
        }

        const command = new PutObjectCommand(params)
        await client.send(command)

        res.status(200).json({message: "Chat exported successfully"})
    } catch (error: any) {
        console.log("Failed to export chat. Error : " + error.message)
        res.status(500).json({
            message: `Failed to export chat`,
            error: error.message
        })
    }
}

const importChat = async (req: Request, res: Response) => {
    if (!req.body.fileName) {
        res.status(404).send("File name empty")
        return
    }

    try {
        const fileName = req.body.fileName
        const getObjectParams = {
            Bucket: process.env.BUCKET_NAME!!,
            Key: fileName
        }

        const command = new GetObjectCommand(getObjectParams)
        const url = await getSignedUrl(client, command, {expiresIn: 3600})

        res.status(200).json({fileUrl : url})
    } catch (error: any) {
        console.log("Failed to import chat. Error : " + error.message)
        res.status(500).json({
            message: `Failed to import chat`,
            error: error.message
        })
    }
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
            message: `Failed to upload image`,
            error: error.message
        })
    }
}

export default {
    sendAttachment,
    exportChat,
    importChat
}
