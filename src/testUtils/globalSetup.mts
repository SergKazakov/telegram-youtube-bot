import { MongoDBContainer } from "@testcontainers/mongodb"

export default async function globalSetup() {
  const container = await new MongoDBContainer("mongo:8").start()

  process.env.MONGODB_CONNECTION_STRING = container.getConnectionString()

  return async () => {
    await container.stop()
  }
}
