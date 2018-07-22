export const errorHandler = async (ctx, next) => {
  try {
    await next()
  } catch ({ message }) {
    return ctx.reply(message)
  }
}
