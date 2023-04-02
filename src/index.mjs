import { server } from "./server/index.mjs"

server.listen(process.env.PORT, () =>
  console.log(`Listening on ${process.env.PORT}`),
)
