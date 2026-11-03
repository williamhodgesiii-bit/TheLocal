import { NextResponse } from "next/server";

/* The checklist flyer ("How many have you eaten at?"): straight to stamping the places you've been. */
export function GET(req: Request) {
  return NextResponse.redirect(new URL("/?stamp=1&utm_source=flyer&utm_medium=print&utm_campaign=launch&utm_content=checklist", req.url), 307);
}
