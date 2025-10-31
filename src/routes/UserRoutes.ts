import {Router} from "express"

import userController from "../controller/UserController";
import multer from "../util/multer";

const router = Router()

router.post("/createUser", userController.createUser)

router.post("/createProfile", multer.single('image'), userController.createUser)

router.get("/profile/:id", userController.getUserDetailsById)

router.post("/verifyUsername/:username", userController.verifyUsername)

router.post("/updateCode/:id", userController.updateUserCode)

export default router
