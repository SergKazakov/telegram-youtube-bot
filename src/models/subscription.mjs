import mongoose from "mongoose"

const schema = new mongoose.Schema(
  {
    channelId: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
    isNotificationEnabled: { type: Boolean, required: true, default: true },
  },
  { timestamps: true },
)

export const Subscription = mongoose.model("Subscription", schema)
