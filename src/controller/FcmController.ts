import { Request, Response } from 'express'
import { FcmToken } from '../model/FcmToken'

const saveToken = async (req: Request, res: Response) => {
    const { userId, token } = req.body

    if (!userId || !token) {
        res.status(400).json({ message: 'UserId and Token are required' })
        return
    }

    try {
        await FcmToken.updateOne(
            { userId: userId },
            {
                userId,
                token,
                lastActive: new Date(),
            },
            { upsert: true } // create if not exists, else update
        )

        res.status(200).json({ message: 'Token saved' })
    } catch (err) {
        console.error('Error saving push token', err)
        res.status(500).json({ message: 'Internal server error' })
        return
    }
}

export default {
    saveToken
}