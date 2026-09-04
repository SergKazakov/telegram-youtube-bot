import axios, { type AxiosInstance } from "axios"
import { type Filter } from "mongodb"
import { expect } from "vitest"

import {
  type ChannelSchema,
  type ChatSchema,
  DEFAULT_CHANNEL,
  type DeliverySchema,
  type SubscriptionSchema,
  type VideoSchema,
  channelCollection,
  chatCollection,
  deliveryCollection,
  subscriptionCollection,
  videoCollection,
} from "../mongodb.mts"

export let client: AxiosInstance

export const setupClient = (unix: string) => {
  client = axios.create({
    maxRedirects: 0,
    socketPath: unix,
    validateStatus: () => true,
  })
}

export const createChat = (attrs?: Partial<ChatSchema>) =>
  chatCollection.insertOne({
    _id: "chatId",
    refreshToken: "refreshToken",
    ...attrs,
  })

export const createChannel = (attrs?: Partial<ChannelSchema>) =>
  channelCollection.insertOne({
    ...DEFAULT_CHANNEL,
    _id: "channelId",
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
    lockedAt: null,
    status: "pending",
    attempts: 0,
    ...attrs,
  })

export const expectCounts = async (videos: number, deliveries: number) => {
  await expect(videoCollection.countDocuments()).resolves.toBe(videos)

  await expect(deliveryCollection.countDocuments()).resolves.toBe(deliveries)
}

export const expectChannel = async (
  attrs: Omit<Partial<ChannelSchema>, "_id"> | null,
  filter: Filter<ChannelSchema> = {},
) => {
  const channel = await channelCollection.findOne({
    _id: "channelId",
    ...filter,
  })

  if (attrs === null) {
    expect(channel).toBeNull()

    return
  }

  expect(channel).toMatchObject(attrs)
}
