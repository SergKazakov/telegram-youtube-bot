import Agenda from "agenda"

import { db } from "./mongodb.mjs"
import { emitEvent } from "./pubsub/index.mjs"

export const agenda = new Agenda({ mongo: db })

agenda.on("fail", error => console.error(error))

agenda.define("prolongSubscription", async job => {
  await emitEvent("subscribe")(job.attrs.data)
})

await agenda.start()
