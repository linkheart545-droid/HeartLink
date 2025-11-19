import { Router, Request, Response } from "express"
import UserRoutes from "./routes/UserRoutes"
import dotenv from 'dotenv'
import RoomRoutes from "./routes/RoomRoutes";
import MoodRoutes from "./routes/MoodRoutes";
import FcmRoutes from "./routes/FcmRoutes";
dotenv.config()

const route = Router()

route.use('/user', UserRoutes) // User Routes
route.use('/room', RoomRoutes) // Room Routes
route.use('/mood', MoodRoutes) // User Routes
route.use('/push', FcmRoutes) // Fcm Routes

// Test Route
route.get('/', (_req: Request, res: Response) => {
    res.send('Server is working !!')
})

export default route
