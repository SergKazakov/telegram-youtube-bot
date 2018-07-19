import mongoose from "mongoose"

const schema = new mongoose.Schema(
  {
    userId: { type: Number, required: true },
    chatId: { type: Number, required: true },
    channels: { type: [String], default: [] },
    tokens: Object,
  },
  { timestamps: true },
)

export const User = mongoose.model("User", schema)
