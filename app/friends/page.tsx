import type { Metadata } from "next";
import Explorer from "@/components/Explorer";

export const metadata: Metadata = { title: "Friends", robots: { index: false } };

export default function FriendsPage() {
  return <Explorer initialView="friends" />;
}
