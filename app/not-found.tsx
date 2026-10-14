import Link from "next/link";
import { PlateMark } from "@/components/Brand";
import { MANTRA } from "@/lib/brand";

export default function NotFound() {
  return (
    <main className="nf">
      <PlateMark size={84} />
      <h1>This plate&apos;s been cleared.</h1>
      <p>The page you wanted isn&apos;t here. The places next door still are.</p>
      <Link className="btn btn-green" href="/">
        Back to the map
      </Link>
      <p className="muted small">{MANTRA}</p>
    </main>
  );
}
