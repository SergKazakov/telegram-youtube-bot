import { type ServerResponse } from "node:http"

import { chatCollection } from "../mongodb.ts"

export const healthCheck = async (res: ServerResponse) => {
  const statusCode = await chatCollection
    .findOne()
    .then(() => 204)
    .catch(() => 503)

  res.writeHead(statusCode).end()
}
