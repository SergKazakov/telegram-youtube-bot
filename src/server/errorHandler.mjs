export const errorHandler = ({ status = 500, message }, req, res, _) =>
  res.status(status).send({ message })
