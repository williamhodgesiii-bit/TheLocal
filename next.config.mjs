/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // pages are built ahead of time; the first paint shows the week's plate as of the build,
  // then the visitor's own clock takes over (no layout jump unless a Thursday has passed)
  env: { NEXT_PUBLIC_BUILT_AT: String(Date.now()) },
  // the share cards read their fonts (and owners' photos) from disk at request time on Vercel
  experimental: {
    outputFileTracingIncludes: { "/**": ["./assets/og/**/*", "./public/photos/**/*"] },
  },
  // Security headers on every response. HTTPS only (and remembered for two years); no other site can
  // put ours in a frame to trick people into clicking (clickjacking); browsers don't guess file
  // types; links to other sites don't leak the full address; the camera and location only for us;
  // Google sign-in's pop-up still works. The CSP sets only rules that can't break the page.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self), payment=(), usb=(), browsing-topics=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          { key: "Content-Security-Policy", value: "base-uri 'self'; object-src 'none'; frame-ancestors 'none'; upgrade-insecure-requests" },
        ],
      },
    ];
  },
};
export default nextConfig;
