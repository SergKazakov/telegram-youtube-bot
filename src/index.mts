import { startBot } from "./bot/index.mts"
import { setupCron } from "./cron/index.mts"
import { setupDatabase } from "./mongodb.mts"
import { createServer } from "./server/index.mts"

await setupDatabase()

setupCron()

const { listen } = createServer()

await listen()

await startBot()
