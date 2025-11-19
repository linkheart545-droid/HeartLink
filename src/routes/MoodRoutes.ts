import {Router} from "express"
import moodController from "../controller/MoodController";

const router = Router()

router.post("/all", moodController.getPastMoodsList)
router.post("/send", moodController.sendMood)

export default router