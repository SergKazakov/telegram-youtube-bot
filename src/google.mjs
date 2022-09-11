import googleapis from "googleapis"

export const getOauth2Client = () =>
  new googleapis.google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URL,
  )

export const getYoutubeClient = refreshToken => {
  const auth = getOauth2Client()

  auth.setCredentials({ refresh_token: refreshToken })

  return googleapis.google.youtube({ version: "v3", auth })
}
