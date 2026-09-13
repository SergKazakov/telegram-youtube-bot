import { expect, it, vi } from "vitest"

import { getOAuth2Client } from "../__mocks__/utils.mts"
import { chatCollection } from "../mongodb.mts"
import { call } from "../testUtils/index.mts"
import { signState } from "../utils.mts"

const send = (params: URLSearchParams) => call("/oauth2callback", { params })

it("should return 400", async () => {
  {
    const { status } = await send(new URLSearchParams({ state: "state" }))

    expect(status).toBe(400)
  }

  {
    const { status } = await send(new URLSearchParams({ code: "code" }))

    expect(status).toBe(400)
  }

  {
    const { status } = await send(
      new URLSearchParams({ code: "code", state: "state" }),
    )

    expect(status).toBe(400)
  }
})

it("should save the refresh token and redirect to the bot", async () => {
  const chatId = "chatId"

  getOAuth2Client.mockReturnValue({
    getToken: vi
      .fn()
      .mockResolvedValue({ tokens: { refresh_token: "refreshToken" } }),
  })

  const { status, headers } = await send(
    new URLSearchParams({ code: "code", state: signState(chatId) }),
  )

  expect(status).toBe(302)

  expect(headers.get("location")).toBe("https://t.me/username")

  await expect(chatCollection.findOne({ _id: chatId })).resolves.toMatchObject({
    refreshToken: "refreshToken",
  })
})
