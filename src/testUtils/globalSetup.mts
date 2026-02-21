import { MongoDBContainer } from "@testcontainers/mongodb"

export default async function globalSetup() {
  const mongodbContainer = await new MongoDBContainer("mongo:8")
    .withReuse()
    .start()

  process.env.MONGODB_CONNECTION_STRING = mongodbContainer.getConnectionString()
}
