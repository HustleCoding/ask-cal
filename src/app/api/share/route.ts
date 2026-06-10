import { encodeShare, type SharedAnswer } from "@/lib/share";

export async function POST(req: Request) {
  const payload: SharedAnswer = await req.json();
  if (!payload?.q || !payload?.a) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }
  return Response.json({ token: encodeShare(payload) });
}
