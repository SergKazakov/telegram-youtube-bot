import { db } from "../mongodb.mts"

import { type RequestHandler } from "./types.mts"

export const healthCheck: RequestHandler = async () => {
  let status = 204

  try {
    await db.command({ ping: 1 })
  } catch {
    status = 503
  }

  return new Response(null, { status })
}
