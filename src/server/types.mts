import { type BunRequest, type Serve } from "bun"

export type RequestHandler = Serve.Handler<
  BunRequest<string>,
  Bun.Server<undefined>,
  Response
>
