import { User } from "../models/user"

export const getUserMiddleware = async (ctx, next) => {
  const user = await User.findOne({ userId: ctx.from.id })

  ctx.state.user = user

  return next()
}
