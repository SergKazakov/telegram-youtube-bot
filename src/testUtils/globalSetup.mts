import { GenericContainer, Wait } from "testcontainers"

export default async function globalSetup() {
  const container = await new GenericContainer("mongo:9")
    .withExposedPorts(27_017)
    .withWaitStrategy(Wait.forListeningPorts())
    .start()

  Bun.env.MONGODB_CONNECTION_STRING = `mongodb://${container.getHost()}:${container.getMappedPort(27_017)}`

  return () => container.stop()
}
