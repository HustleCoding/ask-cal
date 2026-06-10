import zlib from "zlib";

export type SharedAnswer = {
  q: string;
  a: string;
  sources: {
    title: string;
    url: string;
    year: string;
    type: "article" | "podcast";
  }[];
};

export function encodeShare(payload: SharedAnswer): string {
  const json = JSON.stringify({
    ...payload,
    a: payload.a.slice(0, 3000),
    sources: payload.sources.slice(0, 4),
  });
  return zlib.deflateRawSync(Buffer.from(json, "utf8")).toString("base64url");
}

export function decodeShare(token: string): SharedAnswer | null {
  try {
    const json = zlib
      .inflateRawSync(Buffer.from(token, "base64url"))
      .toString("utf8");
    const data = JSON.parse(json);
    if (typeof data.q !== "string" || typeof data.a !== "string") return null;
    return {
      q: data.q,
      a: data.a,
      sources: Array.isArray(data.sources) ? data.sources : [],
    };
  } catch {
    return null;
  }
}
