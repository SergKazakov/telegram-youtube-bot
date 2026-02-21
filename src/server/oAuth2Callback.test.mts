import { expect, it, vi } from "vitest"

import { getOAuth2Client } from "../__mocks__/utils.mts"
import { bot } from "../bot/index.mts"
import { chatCollection } from "../mongodb.mts"
import { client } from "../testUtils/index.mts"

const getOAuth2Callback = (params: Record<string, string>) =>
  client("/oauth2callback", { params })

it("should return 400", async () => {
  {
    const { status } = await getOAuth2Callback({ state: "foo" })

    expect(status).toBe(400)
  }

  {
    const { status } = await getOAuth2Callback({ code: "foo" })

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
    code: "foo",
    state: Buffer.from(chatId).toString("base64"),
  })

  expect(status).toBe(302)

  expect(headers.location).toBe("https://t.me/username")

  expect(bot.telegram.sendMessage).toHaveBeenCalledWith(chatId, "Success")

  await expect(chatCollection.findOne({ _id: chatId })).resolves.toMatchObject({
    refreshToken: "refreshToken",
  })
})
