/** Crashes reported by visitors' browsers (lib/recover.ts), written to the server log. Nothing is stored. */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const text = (await req.text()).slice(0, 4000);
    const j = JSON.parse(text) as Record<string, unknown>;
    console.error("client-error", JSON.stringify({ where: j.where, name: j.name, message: j.message, url: j.url, digest: j.digest, ua: j.ua, stack: j.stack }));
  } catch {
    /* ignore bad bodies */
  }
  return new Response(null, { status: 204 });
}
