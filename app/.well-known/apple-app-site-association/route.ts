export const dynamic = "force-dynamic";

/**
 * Tells iOS which links open the iPhone app instead of Safari (universal links), and lets the
 * app use passkeys saved for this site. Apple fetches it from
 * https://www.theplatenextdoor.com/.well-known/apple-app-site-association. Off until APPLE_TEAM_ID
 * is set, since the app ID is the team ID plus the bundle ID.
 */
export function GET() {
  const team = process.env.APPLE_TEAM_ID;
  if (!team) return new Response("Not found", { status: 404 });
  const app = `${team}.${process.env.IOS_BUNDLE_ID || "com.theplatenextdoor.app"}`;
  const body = {
    applinks: {
      details: [
        {
          appIDs: [app],
          components: [
            // link-outs and the API stay in the browser
            { "/": "/api/*", exclude: true },
            { "/": "/go/*", exclude: true },
            { "/": "/admin*", exclude: true },
            { "/": "/*" },
          ],
        },
      ],
    },
    webcredentials: { apps: [app] },
  };
  return Response.json(body, { headers: { "cache-control": "public, max-age=3600" } });
}
