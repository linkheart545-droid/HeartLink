import {Router} from "express";
import FcmController from "../controller/FcmController";

const router =  Router()

router.post('/saveToken', FcmController.saveToken)

export default router