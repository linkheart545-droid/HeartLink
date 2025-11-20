import mongoose, { Schema, Document } from "mongoose"

export interface Chat extends Document {
    id: number
    senderId: number
    receiverId: number
    code: string
    message: string
    attachment:string
    timestamp: Date
}

const chatSchema = new Schema<Chat>({
    id: { type: Number, unique: true, required: true },
    senderId: { type: Number, required: true },
    receiverId: { type: Number, required: true },
    code: { type: String, required: true },
    message: { type: String, default: "" },
    attachment: { type: String, default: "" },
    timestamp: { type: Date, default: Date.now },
})

chatSchema.index({ code: "text" })

export const Chat = mongoose.model<Chat>("Chat", chatSchema, "chats")