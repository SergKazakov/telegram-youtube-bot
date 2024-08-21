import { Cron as cron } from "croner"

import { bot } from "./bot/index.ts"
import { subscriptionCollection } from "./mongodb.ts"
import { server } from "./server/index.ts"
import { subscribeToChannel } from "./utils.ts"

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
