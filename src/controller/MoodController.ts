import {Request, Response} from "express"
import {Mood} from "../model/Mood"
import {Room} from "../model/Room";

const getPastMoodsList = async(req: Request, res: Response) => {
    const code = req.body.code
    const moods = await Mood.find({ code: code })
    const room = await Room.exists({ code: code })

    if (!room) {
        res.status(404).json({error: "No room found for given code"})
        return
    }

    if (!moods) {
        res.status(404).json({error: "Could not find past moods"})
        return
    }

    res.status(200).json(moods)
}
export default {
    getPastMoodsList
}