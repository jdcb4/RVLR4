export function buildRoomShareUrl(code: string, origin = window.location.origin) {
  const url = new URL(origin);

  url.pathname = "/name";
  url.searchParams.set("intent", "join");
  url.searchParams.set("code", code);

  return url.toString();
}
