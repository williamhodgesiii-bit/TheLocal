import type { Metadata } from "next";
import Explorer from "@/components/Explorer";

// members are private people: their pages are for the people they share them with, not search engines
export function generateMetadata({ params }: { params: { handle: string } }): Metadata {
  return { title: `@${params.handle.toLowerCase()}`, robots: { index: false, follow: false } };
}

export default function MemberRoute({ params }: { params: { handle: string } }) {
  return <Explorer initialView="member" initialHandle={params.handle.toLowerCase()} />;
}
