import { MongoClient } from "mongodb"

const mongoClient = await MongoClient.connect(process.env.MONGODB_URL as string)

const db = mongoClient.db()

export const chatCollection = db.collection<{
  _id: string
  refreshToken: string
}>("chats")

export const subscriptionCollection = db.collection<{
  _id: { channelId: string; chatId: string }
}>("subscriptions")

export const videoCollection = db.collection<{ _id: string }>("videos")
