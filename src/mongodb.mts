import { MongoClient } from "mongodb"

import { env } from "./env.mts"

export const mongoClient = await MongoClient.connect(env.MONGODB_URL)

export const db = mongoClient.db()

export const chatCollection = db.collection<{
  _id: string
  refreshToken: string
}>("chats")

export const subscriptionCollection = db.collection<{
  _id: { channelId: string; chatId: string }
}>("subscriptions")

export const videoCollection = db.collection<{
  _id: string
  publishedAt: Date
}>("videos")
