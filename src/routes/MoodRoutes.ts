import {Router} from "express"
import moodController from "../controller/MoodController";

const router = Router()

router.post("/all", moodController.getPastMoodsList)
router.post("/send", moodController.sendMood)
router.get("/last/:id", moodController.getLastMood)

export default router