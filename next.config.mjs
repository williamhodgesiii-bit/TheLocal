/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // pages are built ahead of time; the first paint shows the week's plate as of the build,
  // then the visitor's own clock takes over (no layout jump unless a Thursday has passed)
  env: { NEXT_PUBLIC_BUILT_AT: String(Date.now()) },
};
export default nextConfig;
