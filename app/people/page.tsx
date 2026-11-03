import type { Metadata } from "next";
import Explorer from "@/components/Explorer";

export const metadata: Metadata = { title: "People", description: "Find friends and Birmingham's most useful local food reviewers.", alternates: { canonical: "/people" } };

export default function PeoplePage() {
  return <Explorer initialView="people" />;
}
