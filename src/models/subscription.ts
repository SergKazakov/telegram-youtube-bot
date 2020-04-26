import { Schema, model, Document } from "mongoose"

export interface SubscriptionDocument extends Document {
  channelId: string
  user: string
}

const schema = new Schema(
  {
    channelId: { type: String, required: true },
    user: { type: Schema.Types.ObjectId, required: true, ref: "User" },
  },
  { timestamps: true },
)

export const Subscription = model<SubscriptionDocument>("Subscription", schema)
