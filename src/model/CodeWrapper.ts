import mongoose, { Schema, Document } from "mongoose"

export interface CodeWrapper extends Document {
    senderId: number
    receiverId: number
    code: string
}

const codeWrapperSchema = new Schema<CodeWrapper>({
    senderId: { type: Number, required: true },
    receiverId: { type: Number, required: true },
    code: { type: String, required: true }
})

codeWrapperSchema.index({ code: "text" })

export const CodeWrapper = mongoose.model<CodeWrapper>("CodeWrapper", codeWrapperSchema, "codeWrapper")