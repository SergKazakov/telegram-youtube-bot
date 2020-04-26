export const handleError = (fn: (...args: unknown[]) => Promise<void>) => (
  ...args: unknown[]
): Promise<void> => fn(...args).catch(console.log)
