import type { Metadata } from "next";
import AdminQueue from "@/components/AdminQueue";

export const metadata: Metadata = { title: "Verification desk", robots: { index: false, follow: false } };

export default function AdminPage() {
  return <AdminQueue />;
}
