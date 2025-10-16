import {Request, Response} from "express"
import {User} from "../model/User"
import {DeleteObjectCommand, GetObjectCommand, PutObjectCommand} from "@aws-sdk/client-s3"
import crypto from 'crypto'
import {getSignedUrl} from "@aws-sdk/s3-request-presigner"
import client from "../util/s3Client"

// Image Name Generator
const randomImageName = () => crypto.randomBytes(32).toString('hex')

const createUser = async (req: Request, res: Response) => {
    try {
        // Proceed with user creation
        const {email, username, name, gender} = req.body
        const exists = await User.findOne({username: username})

        if (exists) {
            res.status(400).json({error: "Username already exists"})
            return
        }

        let imageName = ""

        if (req.file) {
            try {
                imageName = randomImageName()
                const params = {
                    Bucket: process.env.BUCKET_NAME!!,
                    Key: imageName,
                    Body: req.file!!.buffer,
                    ContentType: req.file!!.mimetype
                }

                const command = new PutObjectCommand(params)
                await client.send(command)
            } catch (error: any) {
                console.log("Failed to upload image. Error : " + error.message)
            }
        }

        // Count the existing users to assign a new ID
        const count = await User.countDocuments({}, {hint: "_id_"})

        // Create a new user
        const user = new User({
            id: count + 1,
            email: email,
            username: username,
            profileImageUrl: imageName,
            name: name,
            gender: gender,
            code: ""
        })

        // Save the user to the database
        const createdUser = await user.save()

        // Respond with the newly created user
        res.status(201).json({user: createdUser})

    } catch (error: any) {
        res.status(500).json({error: "Failed to create user", details: error.message})
    }
}

const getUserDetailsById = async (req: Request, res: Response) => {
    try {
        // Proceed with user creation
        const id = req.params.id
        const user = await User.findOne({id: id})

        if (!user) {
            res.status(404).json({error: "User not found"})
            return
        }

        if (user.profileImageUrl != "") {
            const getObjectParams = {
                Bucket: process.env.BUCKET_NAME!!,
                Key: user.profileImageUrl
            }

            const command = new GetObjectCommand(getObjectParams)
            user.profileImageUrl = await getSignedUrl(client, command, {expiresIn: 3600})
        }

        // Respond with the fetched user
        res.status(200).json(user)

    } catch (error: any) {
        res.status(500).json({error: "Failed to fetch user", details: error.message})
    }
}

const updateUserCode = async (req: Request, res: Response) => {
    try {
        // Proceed with user creation
        const id = req.params.id
        const code = req.body.code
        const user = await User.findOne({id: id})

        if (!user) {
            res.status(404).json({error: "User not found"})
            return
        }

        if (code && code != "") {
            user.code = code
        }

        await user.save()

        // Respond with the fetched user
        res.status(200).json({ message: "Code updated successfully" })

    } catch (error: any) {
        res.status(500).json({error: "Failed to update code", details: error.message})
    }
}

export default {
    createUser,
    getUserDetailsById,
    updateUserCode
}
