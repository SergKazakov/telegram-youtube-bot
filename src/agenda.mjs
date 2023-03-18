import Agenda from "agenda"

import { emitEvent } from "./pubsub/index.mjs"

export const agenda = new Agenda({ db: { address: process.env.MONGODB_URL } })

agenda.on("fail", error => console.error(error))

agenda.define("prolongSubscription", async job => {
  await emitEvent("subscribe")(job.attrs.data)
})

await agenda.start()
