import { type ServerResponse } from "node:http"

import { db } from "../mongodb.mts"

export const healthCheck = async (res: ServerResponse) => {
  let statusCode = 204

  try {
    await db.command({ ping: 1 })
  } catch {
    statusCode = 503
  }

  res.writeHead(statusCode).end()
}
