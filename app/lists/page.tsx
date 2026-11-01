import type { Metadata } from "next";
import Explorer from "@/components/Explorer";

export const metadata: Metadata = { title: "Your lists", robots: { index: false } };

export default function ListsPage() {
  return <Explorer initialView="lists" />;
}
