export const errorHandler = async (ctx, next) => {
  try {
    await next()
  } catch (error) {
    console.log(error)

    return ctx.reply("Ooops")
  }
}
