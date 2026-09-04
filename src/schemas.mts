import * as yup from "yup"

const linkSchema = yup.object({ "@href": yup.string().url().required() })

type Link = yup.InferType<typeof linkSchema>

export const normalizeLinks = (link?: Link[] | Link) =>
  Array.isArray(link) ? link : link ? [link] : []

export const schemaToHandleNotification = yup.object({
  feed: yup
    .object({
      entry: yup
        .object({
          "yt:videoId": yup.string().required(),
          "yt:channelId": yup.string().required(),
          title: yup.string().required(),
          link: yup
            .array()
            .of(linkSchema)
            .transform((_, originalValue) => normalizeLinks(originalValue)),
          author: yup.object({ name: yup.string().required() }).required(),
          published: yup.date(),
        })
        .required(),
    })
    .required(),
})

export type FeedEntry = yup.InferType<
  typeof schemaToHandleNotification
>["feed"]["entry"]

export const schemaToConfirmSubscription = yup.object({
  "hub.challenge": yup.string().trim().required(),
  "hub.topic": yup.string().url().required(),
  "hub.mode": yup.string().oneOf(["subscribe", "unsubscribe"]).required(),
})

export const schemaToHandleOAuth2Callback = yup.object({
  code: yup.string().trim().required(),
  state: yup.string().trim().required(),
})
