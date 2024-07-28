import { Cron as cron } from "croner"

import { bot } from "./bot/index.mjs"
import { subscriptionCollection } from "./mongodb.mjs"
import { server } from "./server/index.mjs"
import { subscribeToChannel } from "./utils.mjs"

server.listen(process.env.PORT, () =>
  console.log(`Listening on ${process.env.PORT}`),
)

cron("0 0 0 * * *", { catch: error => console.error(error) }, async () => {
  for await (const x of subscriptionCollection.aggregate<{ _id: string }>([
    { $group: { _id: "$_id.channelId" } },
  ])) {
    await subscribeToChannel(x._id)
  }
})

await bot.launch({ allowedUpdates: [] })
