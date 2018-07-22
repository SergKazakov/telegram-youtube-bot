import Markup from "telegraf/markup"
import { Subscription } from "../../models/subscription"
import { emitEvent } from "../../pubsub"

export const execAction = action => async ctx => {
  const [, id] = ctx.match

  const subscription = await Subscription.findById(id)

  if (!subscription) {
    throw new Error("Subscription not found")
  }

  await emitEvent(action)(subscription.channelId)

  await subscription.update({ isNotificationEnabled: action === "subscribe" })

  return ctx.editMessageReplyMarkup(
    Markup.inlineKeyboard([
      Markup.callbackButton(
        `${action === "subscribe" ? "Unsubscribe" : "Subscribe"}`,
        `/${action === "subscribe" ? "un" : ""}subscribe ${id}`,
      ),
      Markup.callbackButton("Back", "/delete"),
    ]),
  )
}
