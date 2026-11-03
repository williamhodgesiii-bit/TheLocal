import { NextResponse } from "next/server";

/* The tear-off flyer ("Can't pick a place?"): straight to Surprise me. */
export function GET(req: Request) {
  return NextResponse.redirect(new URL("/?surprise=1&utm_source=flyer&utm_medium=print&utm_campaign=launch&utm_content=tearoff", req.url), 307);
}
