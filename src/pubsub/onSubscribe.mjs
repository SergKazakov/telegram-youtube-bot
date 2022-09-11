import { agenda } from "../agenda.mjs"

export const onSubscribe = async ({ topic, lease }) => {
  const [, channelId] = topic.split("=")

  await agenda.cancel({ name: "prolongSubscription", data: channelId })

  await agenda.schedule(
    new Date(lease * 1000),
    "prolongSubscription",
    channelId,
  )
}
