import mongoose from "mongoose"

const schema = new mongoose.Schema(
  {
    userId: { type: Number, required: true },
    chatId: { type: Number, required: true },
    subscriptions: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Subscription" },
    ],
    refreshToken: String,
  },
  { timestamps: true },
)

export const User = mongoose.model("User", schema)
