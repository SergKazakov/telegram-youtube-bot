import { cleanupOrphanChannels } from "./cleanupOrphanChannels.mts"
import { deliver } from "./deliver.mts"
import { pollChannels } from "./pollChannels.mts"
import { subscribeToChannels } from "./subscribeToChannels.mts"

export const setupCron = () => {
  Bun.cron("0 */12 * * *", cleanupOrphanChannels)

  Bun.cron("* * * * *", deliver)

  Bun.cron("*/5 * * * *", pollChannels)

  Bun.cron("*/5 * * * *", subscribeToChannels)

  process.on("unhandledRejection", console.error)
}
