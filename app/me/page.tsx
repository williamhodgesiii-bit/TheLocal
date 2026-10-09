import type { Metadata } from "next";
import Explorer from "@/components/Explorer";

export const metadata: Metadata = { title: "Your page", robots: { index: false } };

export default function MePage() {
  return <Explorer initialView="me" />;
}
