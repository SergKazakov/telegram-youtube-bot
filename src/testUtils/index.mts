import axios, { type AxiosInstance } from "axios"

import {
  type ChatSchema,
  type DeliverySchema,
  type SubscriptionSchema,
  type VideoSchema,
} from "../mongodb.mts"
import {
  chatCollection,
  deliveryCollection,
  subscriptionCollection,
  videoCollection,
} from "../mongodb.mts"

export let client: AxiosInstance

export const setupClient = (port: number) => {
  client = axios.create({
    baseURL: `http://localhost:${port}`,
    maxRedirects: 0,
    validateStatus: () => true,
  })
}

export const createChat = (attrs?: Partial<ChatSchema>) =>
  chatCollection.insertOne({
    _id: "chatId",
    refreshToken: "refreshToken",
    ...attrs,
  })

export const createSubscriptions = (
  rows: Array<{ channelId: string; chatId: string }>,
) => subscriptionCollection.insertMany(rows.map(_id => ({ _id })))

export const createChatSubscription = (
  chatAttrs?: Partial<ChatSchema>,
  subscriptionAttrs?: Partial<SubscriptionSchema["_id"]>,
) =>
  Promise.all([
    createChat(chatAttrs),
    subscriptionCollection.insertOne({
      _id: { channelId: "channelId", chatId: "chatId", ...subscriptionAttrs },
    }),
  ])

export const createVideo = (attrs?: Partial<VideoSchema>) =>
  videoCollection.insertOne({
    _id: "videoId",
    publishedAt: new Date(),
    authorName: "name",
    title: "title",
    ...attrs,
  })

export const createDelivery = (attrs?: Partial<DeliverySchema>) =>
  deliveryCollection.insertOne({
    _id: { chatId: "chatId", videoId: "videoId" },
    createdAt: new Date(),
    nextAttemptAt: new Date(),
    status: "pending",
    authorName: "name",
    title: "title",
    attempts: 0,
    ...attrs,
  })
