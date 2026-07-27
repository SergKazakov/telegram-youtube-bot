import { GenericContainer, Wait } from "testcontainers"

export default async function globalSetup() {
  const container = await new GenericContainer("mongo:8")
    .withExposedPorts(27_017)
    .withWaitStrategy(Wait.forLogMessage(/Waiting for connections/i))
    .start()

  Bun.env.MONGODB_CONNECTION_STRING = `mongodb://${container.getHost()}:${container.getMappedPort(27_017)}`

  return async () => {
    await container.stop()
  }
}
