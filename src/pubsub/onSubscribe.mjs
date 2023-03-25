import { agenda } from "../agenda.mjs"

export const onSubscribe = async ({ topic, lease }) => {
  const [, channelId] = topic.split("=")

  await agenda
    .create("prolongSubscription", channelId)
    .unique({ data: channelId, nextRunAt: { $type: "date" } })
    .schedule(new Date(lease * 1000))
    .save()
}
