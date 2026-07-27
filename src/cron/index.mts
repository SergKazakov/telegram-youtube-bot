import { deliver } from "./deliver.mts"
import { resubscribeToChannels } from "./resubscribeToChannels.mts"

export const setupCron = () => {
  Bun.cron("@midnight", resubscribeToChannels)

  Bun.cron("* * * * *", deliver)

  process.on("unhandledRejection", console.error)
}
