import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import PartnerForm from "@/components/PartnerForm";

export const metadata: Metadata = {
  title: "For restaurants — partner with The Local",
  description: "Claim your listing, share your best photos, and get featured where Birmingham decides where to eat tonight.",
};

const TIERS = [
  {
    id: "neighbor",
    name: "Neighbor",
    price: "Free",
    per: "",
    pitch: "Every independent spot deserves a fair shake.",
    perks: ["Claim & verify your listing", "Update hours, links and menu", "Respond to member reviews", "Owner badge on your page"],
  },
  {
    id: "regular",
    name: "Regular",
    price: "$39",
    per: "/mo",
    pitch: "For places ready to stand out in their genre.",
    perks: ["Everything in Neighbor", "Featured (labeled) placement in your genre list", "Curate your photo gallery & cover shot", "Monthly views, saves & directions report", "Add specials and events"],
    hot: true,
  },
  {
    id: "institution",
    name: "Institution",
    price: "$99",
    per: "/mo",
    pitch: "Own your neighborhood on the map.",
    perks: ["Everything in Regular", "Spotlight pin on the neighborhood map", "Boosted odds in Surprise Me (labeled)", "A feature in The Weekly Plate newsletter", "Priority support & quarterly strategy call"],
  },
];

export default function Partners({ searchParams }: { searchParams: { spot?: string } }) {
  return (
    <div className="partners">
      <header className="partners-top">
        <Link href="/" className="btn btn-outline-light btn-sm">
          <ArrowLeft size={14} /> Back to the map
        </Link>
      </header>
      <section className="partners-hero">
        <span className="stamp light">For restaurants, bars & cafés</span>
        <h1 className="display">
          Put your place <em>on the map.</em>
        </h1>
        <p>
          The Local is where Birmingham decides where to eat tonight — independent spots only, no national chains and no fast food. Claim your listing for free, or partner with us to get in front of locals who are hungry right now.
        </p>
      </section>

      <section className="tiers">
        {TIERS.map((t) => (
          <article key={t.id} className={`tier ${t.hot ? "hot" : ""}`}>
            {t.hot && <span className="tier-flag">Most popular</span>}
            <h2 className="display">{t.name}</h2>
            <div className="tier-price">
              <strong>{t.price}</strong>
              <span>{t.per}</span>
            </div>
            <p className="muted">{t.pitch}</p>
            <ul>
              {t.perks.map((p) => (
                <li key={p}>
                  <Check size={15} /> {p}
                </li>
              ))}
            </ul>
            <a href={`#contact`} className={`btn ${t.hot ? "btn-rust" : "btn-ink"} btn-block`}>
              {t.price === "Free" ? "Claim my listing" : `Choose ${t.name}`}
            </a>
          </article>
        ))}
      </section>

      <section className="principles">
        <div>
          <h3 className="eyebrow">Our promise to diners</h3>
          <p>
            Paid placement is always labeled <span className="sponsored">Sponsored</span>. Partners can&apos;t buy, edit or remove member reviews, and ratings only come
            from people with accounts.
          </p>
        </div>
        <div>
          <h3 className="eyebrow">Also available</h3>
          <p>Newsletter sponsorships, neighborhood takeovers (e.g. “Avondale Week”), event listings, and reservation &amp; delivery link-outs for your page.</p>
        </div>
      </section>

      <section id="contact" className="contact">
        <h2 className="display">Let&apos;s talk.</h2>
        <p className="muted">Tell us about your spot — or flag a listing that&apos;s closed or wrong. We answer within one business day.</p>
        <PartnerForm spot={searchParams.spot} />
      </section>
    </div>
  );
}
