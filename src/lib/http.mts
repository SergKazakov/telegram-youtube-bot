import type * as yup from "yup"

export const parseSearchParams = <T extends yup.AnySchema>(
  schema: T,
  request: Request,
) => schema.validate(Object.fromEntries(new URL(request.url).searchParams))
