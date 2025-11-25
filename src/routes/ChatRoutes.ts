import {Router} from "express";
import ChatController from "../controller/ChatController";
import multer from "../util/multer";

const router = Router()

router.post('/sendAttachment', multer.single('image'), ChatController.sendAttachment)
router.post('/export', multer.single('file'), ChatController.exportChat)
router.post('/import', ChatController.importChat)

export default router