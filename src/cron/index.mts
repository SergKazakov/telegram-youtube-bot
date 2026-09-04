import { cleanupOrphanChannels } from "./cleanupOrphanChannels.mts"
import { deliver } from "./deliver.mts"
import { subscribeToChannels } from "./subscribeToChannels.mts"

export const setupCron = () => {
  Bun.cron("0 */12 * * *", cleanupOrphanChannels)

  Bun.cron("*/5 * * * *", subscribeToChannels)

  Bun.cron("* * * * *", deliver)

  process.on("unhandledRejection", console.error)
}
