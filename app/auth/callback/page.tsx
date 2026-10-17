import type { Metadata } from "next";
import AuthCallback from "./AuthCallback";

export const metadata: Metadata = { title: "Signing you in", robots: { index: false, follow: false } };

export default function Page() {
  return <AuthCallback />;
}
