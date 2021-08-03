export const handleError =
  fn =>
  (...args) =>
    fn(...args).catch(console.log)
