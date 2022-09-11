import { MongoClient } from "mongodb"

export const mongoClient = await MongoClient.connect(process.env.MONGODB_URL)

export const db = mongoClient.db()

export const chatCollection = db.collection("chats")

export const subscriptionCollection = db.collection("subscriptions")

export const videoCollection = db.collection("videos")
