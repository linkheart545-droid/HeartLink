import mongoose, { Schema, Document } from "mongoose"

export interface Room extends Document {
    userId1: number // 1
    userId2: number // 2
    code: string
}

const roomSchema = new Schema<Room>({
    userId1: { type: Number, required: true },
    userId2: { type: Number, required: true },
    code: { type: String, required: true }
})

roomSchema.index({ code: "text" })

export const Room = mongoose.model<Room>("Room", roomSchema, "rooms")