import {Router} from "express"
import moodController from "../controller/MoodController";

const router = Router()

router.post("/addMood", moodController.addMood)

router.get("/all", moodController.getPastMoodsList)

export default router