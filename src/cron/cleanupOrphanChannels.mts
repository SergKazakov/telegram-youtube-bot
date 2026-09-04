import { channelCollection } from "../mongodb.mts"

export const cleanupOrphanChannels = async () => {
  const orphans = await channelCollection
    .aggregate<{ _id: string }>([
      {
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "_id.channelId",
          as: "subs",
        },
      },
      { $match: { subs: { $size: 0 } } },
      { $limit: 500 },
      { $project: { _id: 1 } },
    ])
    .map(it => it._id)
    .toArray()

  if (orphans.length > 0) {
    await channelCollection.deleteMany({ _id: { $in: orphans } })
  }
}
