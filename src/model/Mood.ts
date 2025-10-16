import mongoose, { Schema, Document } from "mongoose"

export interface Mood extends Document {
    id: number
    moodId: string
    senderId: number
    receiverId: number
    code: string
    timestamp: Date
}

const moodSchema = new Schema<Mood>({
    id: { type: Number, unique: true, required: true },
    moodId: { type: String, required: true },
    senderId: { type: Number, required: true },
    receiverId: { type: Number, required: true },
    code: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
})

moodSchema.index({ code: "text" })

export const Mood = mongoose.model<Mood>("Mood", moodSchema, "moods")