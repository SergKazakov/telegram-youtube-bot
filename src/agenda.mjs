import { Agenda } from "@hokify/agenda"

import { subscriptionCollection } from "./mongodb.mjs"
import { subscribeToChannel } from "./utils.mjs"

export const agenda = new Agenda({ db: { address: process.env.MONGODB_URL } })

agenda.on("fail", error => console.error(error))

agenda.define("prolongSubscription", async job => {
  const channelId = job.attrs.data

  const subscription = await subscriptionCollection.findOne({
    "_id.channelId": channelId,
  })

  if (subscription) {
    await subscribeToChannel(channelId)
  }
})

await agenda.start()
