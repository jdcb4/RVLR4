import helmet from "helmet";

export function createSecurityHeaders(httpsOnly = true) {
  return helmet({
    frameguard: { action: "deny" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        connectSrc: ["'self'", "ws:", "wss:"],
        imgSrc: ["'self'", "data:", "blob:"],
        mediaSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: httpsOnly ? [] : null,
      },
    },
  });
}
