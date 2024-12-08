import { Cron } from "croner"

import { bot } from "./bot/index.mts"
import { subscriptionCollection } from "./mongodb.mts"
import { server } from "./server/index.mts"
import { subscribeToChannel } from "./utils.mts"

server.listen(process.env.PORT, () =>
  console.log(`Listening on ${process.env.PORT}`),
)

// eslint-disable-next-line no-new
new Cron("0 0 0 * * *", { catch: error => console.error(error) }, async () => {
  for await (const x of subscriptionCollection.aggregate<{ _id: string }>([
    { $group: { _id: "$_id.channelId" } },
  ])) {
    await subscribeToChannel(x._id)
  }
})

await bot.launch({ allowedUpdates: [] })
