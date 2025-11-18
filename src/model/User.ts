import mongoose, { Schema, Document } from "mongoose"

export interface User extends Document {
  id: number
  username: string
  email: string
  profileImageUrl: string
  name: string
  gender: string
  code: string
  createdAt: Date
}

const userSchema = new Schema<User>({
  id: { type: Number, unique: true, required: true },
  username: { type: String, default: "" },
  email: { type: String, unique: true, required: true },
  profileImageUrl: { type : String, default: "" },
  name: { type: String, default: "" },
  gender: { type: String, default: "" },
  code: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
})

userSchema.index({ email: "text" })

export const User = mongoose.model<User>("User", userSchema, "users")