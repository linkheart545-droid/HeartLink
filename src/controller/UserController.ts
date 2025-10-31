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
        const email = req.body.email

        if (!email) {
            res.status(400).json({error: "Email is missing"})
            return
        }

        const exists = await User.exists({email: email})

        if (exists) {
            res.status(409).json({message: "User already exists"})
            return
        }

        // Count the existing users to assign a new ID
        const count = await User.countDocuments({}, {hint: "_id_"})

        // Create a new user
        const user = new User({
            id: count + 1,
            email: email,
            username: "",
            profileImageUrl: "",
            name: "",
            gender: "",
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


const createProfile = async (req: Request, res: Response) => {
    try {
        // Proceed with user creation
        const {email, username, name, gender} = req.body
        const user = await User.findOne({email: email})

        if (!user) {
            res.status(404).json({error: "User with email does not exist"})
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

        user.profileImageUrl = imageName
        user.username = username
        user.name = name
        user.gender = gender

        // Save the user to the database
        const savedUser = await user.save()

        // Respond with the newly created user
        res.status(200).json({user: savedUser})

    } catch (error: any) {
        res.status(500).json({error: "Failed to create profile", details: error.message})
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
        res.status(200).json({message: "Code updated successfully"})

    } catch (error: any) {
        res.status(500).json({error: "Failed to update code", details: error.message})
    }
}

const verifyUsername = async (req: Request, res: Response) => {
    // Check if username already exists for any user

    try {
        const username = req.params.username

        if (!username) {
            res.status(400).json({error: "Username not present"})
            return
        }

        const exists = await User.exists({username: username})

        if (exists) {
            res.status(404).json({error: "Username is taken"})
            return
        }

        // Respond with the fetched user
        res.status(200).json({message: "Username available"})

    } catch (error: any) {
        res.status(500).json({error: "Failed to verify username", details: error.message})
    }
}

export default {
    createUser,
    createProfile,
    getUserDetailsById,
    updateUserCode,
    verifyUsername
}
