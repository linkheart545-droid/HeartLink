import {Router} from "express";
import ChatController from "../controller/ChatController";
import multer from "../util/multer";

const router =  Router()

router.get('/getMessages/:code', ChatController.getChat)
router.post('/sendAttachment', multer.single('image'),ChatController.sendAttachment)

export default router