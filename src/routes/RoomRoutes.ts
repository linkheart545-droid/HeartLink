import {Router} from "express"
import roomController from "../controller/RoomController";

const router = Router()

router.post("/generateCode",roomController.generateCode)

router.post("/updateCode",roomController.updateCode)

export default router