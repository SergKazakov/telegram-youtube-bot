import { startBot } from "./bot/index.mts"
import { setupCron } from "./cron/index.mts"
import { setupDatabase } from "./mongodb.mts"
import { createServer } from "./server/createServer.mts"

await setupDatabase()

setupCron()

const server = createServer()

console.log(`Listening on ${server.url.port}`)

await startBot()
