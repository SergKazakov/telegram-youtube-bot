import { Middleware, Context } from "telegraf"

export const errorHandler: Middleware<Context> = async (ctx, next) => {
  try {
    await next()
  } catch (error) {
    console.log(error)

    return ctx.reply("Ooops")
  }
}
