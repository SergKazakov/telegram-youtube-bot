import { MongoClient } from "mongodb"

import { env } from "./env.mts"

export const mongoClient = await MongoClient.connect(env.MONGODB_URL)

export const db = mongoClient.db()

export type ChatSchema = { _id: string; refreshToken: string | null }

export const chatCollection = db.collection<ChatSchema>("chats")

export type SubscriptionSchema = { _id: { channelId: string; chatId: string } }

export const subscriptionCollection =
  db.collection<SubscriptionSchema>("subscriptions")

export type VideoSchema = {
  _id: string
  publishedAt: Date
  authorName: string
  title: string
}

export const videoCollection = db.collection<VideoSchema>("videos")

export type DeliverySchema = {
  _id: { chatId: string; videoId: string }
  createdAt: Date
  nextAttemptAt: Date
  status: "pending" | "delivered" | "failed"
  authorName: string
  title: string
  attempts: number
}

export const deliveryCollection = db.collection<DeliverySchema>("deliveries")

await deliveryCollection.createIndex({ status: 1, nextAttemptAt: 1 })
