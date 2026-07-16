import { Cron } from "croner"

import { deliver } from "./deliver.mts"
import { resubscribeToChannels } from "./resubscribeToChannels.mts"

export const setupCron = () => {
  new Cron(
    "0 0 0 * * *",
    { catch: error => console.error(error) },
    resubscribeToChannels,
  )

  new Cron("*/30 * * * * *", { catch: error => console.error(error) }, deliver)
}
