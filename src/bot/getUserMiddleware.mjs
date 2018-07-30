import { User } from "../models/user"

export const getUserMiddleware = async (ctx, next) => {
  ctx.state.user = await User.findOne({ userId: ctx.from.id })

  return next()
}
