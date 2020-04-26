import { Schema, model, Document } from "mongoose"

export interface UserDocument extends Document {
  userId: string
  chatId: string
  refreshToken?: string
  subscriptions: string[]
}

const schema = new Schema(
  {
    userId: { type: Number, required: true },
    chatId: { type: Number, required: true },
    refreshToken: String,
    subscriptions: [{ type: Schema.Types.ObjectId, ref: "Subscription" }],
  },
  { timestamps: true },
)

export const User = model<UserDocument>("User", schema)
