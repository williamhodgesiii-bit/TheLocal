import type { Metadata } from "next";
import Explorer from "@/components/Explorer";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  return <Explorer />;
}
