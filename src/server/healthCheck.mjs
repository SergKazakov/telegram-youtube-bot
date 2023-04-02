import { chatCollection } from "../mongodb.mjs"

export const healthCheck = async (req, res) => {
  const error = await chatCollection
    .findOne()
    .then(() => null)
    .catch(error => error)

  res.writeHead(error ? 503 : 204).end()
}
