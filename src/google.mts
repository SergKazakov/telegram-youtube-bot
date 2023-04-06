import googleapis from "googleapis"

export const getOAuth2Client = () =>
  new googleapis.google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.PUBLIC_URL}/oauth2callback`,
  )

export const getYoutubeClient = (refreshToken: string) => {
  const auth = getOAuth2Client()

  auth.setCredentials({ refresh_token: refreshToken })

  return googleapis.google.youtube({ version: "v3", auth })
}
