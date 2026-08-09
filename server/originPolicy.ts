import type { CorsOptions } from "cors";

export function isBrowserOriginAllowed(
  origin: string | undefined,
  allowedOrigins: readonly string[],
): boolean {
  return origin === undefined || allowedOrigins.includes(origin);
}

export function createCorsOriginValidator(
  allowedOrigins: readonly string[],
): CorsOptions["origin"] {
  return (origin, callback) => {
    if (isBrowserOriginAllowed(origin, allowedOrigins)) {
      callback(null, true);

      return;
    }

    callback(new Error("Origin is not allowed."));
  };
}
