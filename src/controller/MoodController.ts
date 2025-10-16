import {Request, Response} from "express"
import {Mood} from "../model/Mood"

const getPastMoodsList = async(req: Request, res: Response) => {
    const code = req.body.code
    const moods = await Mood.find({ code: code })

    if (!moods) {
        res.status(404).json({error: "Could not find past moods"})
        return
    }

    res.status(200).json(moods)
}

const addMood = async (req: Request, res: Response) => {
    const { moodId, senderId, receiverId, code } = req.body.code
    const count = await Mood.countDocuments({}, {hint: "_id_"})

    if (!moodId || !senderId || !receiverId || !code) {
        res.status(400).json({error: "Bad request"})
    }

    const mood = new Mood({
        id: count + 1,
        moodId: moodId,
        senderId: senderId,
        receiverId: receiverId,
        code: code
    })

    const createdMood = await mood.save()

    res.status(201).json({ mood: createdMood, message: "Mood added successfully" })
}

export default {
    getPastMoodsList,
    addMood
}