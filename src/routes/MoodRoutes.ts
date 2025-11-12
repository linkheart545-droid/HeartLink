import {Router} from "express"
import moodController from "../controller/MoodController";

const router = Router()

router.post("/all", moodController.getPastMoodsList)

export default router