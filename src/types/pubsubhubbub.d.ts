declare module "pubsubhubbub" {
  import { RequestListener } from "http"
  import { EventEmitter } from "events"

  class Pubsubhubbub extends EventEmitter {
    subscribe(
      topic: string,
      hub: string,
      callback: (err: unknown, result: unknown) => void,
    ): void

    listener(): RequestListener
  }

  function createServer(options: { callbackUrl: string }): Pubsubhubbub
}
