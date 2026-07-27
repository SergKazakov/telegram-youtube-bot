import { expect, it, vi } from "vitest"

import { getOAuth2Client } from "../__mocks__/utils.mts"
import { chatCollection } from "../mongodb.mts"
import { client } from "../testUtils/index.mts"

const getOAuth2Callback = (params: Record<string, string>) =>
  client("/oauth2callback", { params })

it("should return 400", async () => {
  {
    const { status } = await getOAuth2Callback({ state: "state" })

    expect(status).toBe(400)
  }

  {
    const { status } = await getOAuth2Callback({ code: "code" })

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

  const { status, headers } = await getOAuth2Callback({
    code: "code",
    state: btoa(chatId),
  })

  expect(status).toBe(302)

  expect(headers.location).toBe("https://t.me/username")

  await expect(chatCollection.findOne({ _id: chatId })).resolves.toMatchObject({
    refreshToken: "refreshToken",
  })
})
