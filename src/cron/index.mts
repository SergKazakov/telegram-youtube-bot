import { env } from "../env.mts"

import { cleanupOrphanChannels } from "./cleanupOrphanChannels.mts"
import { deliver } from "./deliver.mts"
import { pollChannels } from "./pollChannels.mts"
import { subscribeToChannels } from "./subscribeToChannels.mts"

export const setupCron = () => {
  for (const { key, handler } of [
    {
      key: "CRON_TASK_TO_CLEANUP_ORPHAN_CHANNELS",
      handler: cleanupOrphanChannels,
    },
    { key: "CRON_TASK_TO_DELIVER", handler: deliver },
    { key: "CRON_TASK_TO_POLL_CHANNELS", handler: pollChannels },
    { key: "CRON_TASK_TO_SUBSCRIBE_TO_CHANNELS", handler: subscribeToChannels },
  ] as const) {
    const pattern = env[key]

    if (pattern) {
      Bun.cron(pattern, handler)
    }
  }

  process.on("unhandledRejection", console.error)
}
