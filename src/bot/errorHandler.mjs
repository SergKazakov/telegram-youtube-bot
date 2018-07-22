export const errorHandler = async (ctx, next) => {
  try {
    await next()
  } catch (err) {
    console.log(err)

    return ctx.reply("Ooops")
  }
}
