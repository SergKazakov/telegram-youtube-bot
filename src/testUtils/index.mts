import axios, { type AxiosInstance } from "axios"

export let client: AxiosInstance

export const setupClient = (port: number) => {
  client = axios.create({
    baseURL: `http://localhost:${port}`,
    maxRedirects: 0,
    validateStatus: () => true,
  })
}
