import terminus from "@godaddy/terminus"

import { chatCollection, mongoClient } from "./mongodb.mjs"
import { server } from "./server/index.mjs"

terminus.createTerminus(server, {
  healthChecks: {
    async "/healthcheck"() {
      await chatCollection.findOne()
    },
  },
  signals: ["SIGINT", "SIGTERM"],
  onSignal: () => mongoClient.close().catch(console.error),
  logger: console.log,
})

server.listen(process.env.PORT, () =>
  console.log(`Listening on ${process.env.PORT}`),
)
