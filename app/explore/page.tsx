import type { Metadata } from "next";
import Explorer from "@/components/Explorer";

export const metadata: Metadata = {
  title: "Explore Birmingham's locally owned restaurants, coffee & bars",
  alternates: { canonical: "/explore" },
};

export default function ExplorePage() {
  return <Explorer initialView="explore" />;
}
