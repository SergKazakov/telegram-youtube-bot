import Markup from "telegraf/markup"
import { Subscription } from "../models/subscription"

export const onSubscriptionsCommand = async ctx => {
  const subscriptions = await Subscription.find({ user: ctx.state.user.id })

  return ctx.reply(
    "Your subscriptions",
    Markup.inlineKeyboard(
      [
        ...subscriptions.map(({ id, title }) =>
          Markup.callbackButton(title, `/subscription ${id}`),
        ),
        Markup.callbackButton("Back", "/delete"),
      ],
      {
        columns: 1,
      },
    ).extra(),
  )
}
