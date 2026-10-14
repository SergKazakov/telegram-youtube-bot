import { timingSafeEqual } from "node:crypto"

export const createHmac = (
  data: string,
  secret: string,
  algorithm: "sha1" | "sha256" = "sha256",
) => new Bun.CryptoHasher(algorithm, secret).update(data).digest("hex")

export const safeEqual = (a: string, b: string) => {
  const bufferA = Buffer.from(a)

  const bufferB = Buffer.from(b)

  return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB)
}
