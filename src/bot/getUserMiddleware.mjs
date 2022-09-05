import { User } from "../models/index.mjs"

export const getUserMiddleware = async (ctx, next) => {
  ctx.state.user = await User.findOne({ userId: ctx.from.id })

  return next()
}
