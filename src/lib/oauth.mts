import { auth } from "@googleapis/youtube"
import dayjs from "dayjs"

import { env } from "../env.mts"

import { createHmac, safeEqual } from "./crypto.mts"

export const getOAuth2Client = () =>
  new auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    `${env.PUBLIC_URL}/oauth2callback`,
  )

type OAuth2Client = ReturnType<typeof getOAuth2Client>

export const buildAuthUrl = (client: OAuth2Client, state: string) =>
  client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/youtube"],
    state,
  })

export const exchangeCodeForRefreshToken = async (
  client: OAuth2Client,
  code: string,
) => {
  const {
    tokens: { refresh_token: refreshToken },
  } = await client.getToken(code)

  return refreshToken
}

export const signState = (chatId: string) => {
  const ts = Date.now()

  return btoa(
    `${chatId}.${ts}.${createHmac(`${chatId}.${ts}`, env.OAUTH_SECRET)}`,
  )
}

export const verifyState = (state: string) => {
  let decoded: string

  try {
    decoded = atob(state)
  } catch {
    return null
  }

  const [chatId, ts, signature] = decoded.split(".", 3)

  if (
    !chatId
    || !ts
    || !signature
    || !safeEqual(signature, createHmac(`${chatId}.${ts}`, env.OAUTH_SECRET))
    || dayjs().diff(Number(ts), "m") > env.MINUTES_TO_EXPIRE_STATE
  ) {
    return null
  }

  return chatId
}
