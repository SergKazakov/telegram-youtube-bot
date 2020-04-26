import { Middleware, Context } from "telegraf"

import { User } from "../models/user"

export const getUserMiddleware: Middleware<Context> = async (ctx, next) => {
  ctx.state.user = await User.findOne({ userId: ctx.from?.id })

  return next()
}
