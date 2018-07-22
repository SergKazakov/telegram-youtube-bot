import Markup from "telegraf/markup"
import { Subscription } from "../../models/subscription"

export const getSubscription = async ctx => {
  const [, id] = ctx.match

  const subscription = await Subscription.findOne({
    _id: id,
    user: ctx.state.user.id,
  })

  if (!subscription) {
    throw new Error("Subscription not found")
  }

  const { title, isNotificationEnabled } = subscription

  return ctx.editMessageText(
    title,
    Markup.inlineKeyboard([
      Markup.callbackButton(
        isNotificationEnabled ? "Unsubscribe" : "Subscribe",
        `/${isNotificationEnabled ? "un" : ""}subscribe ${id}`,
      ),
      Markup.callbackButton("Back", "/delete"),
    ]).extra(),
  )
}
