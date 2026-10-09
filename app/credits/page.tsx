import type { Metadata } from "next";
import Link from "next/link";
import Photo from "@/components/Photo";
import { LIBRARY, PLACE_PHOTOS, commonsPage, commonsSrc, commonsSrcSet, licenseUrl, type StockPhoto } from "@/lib/photos";
import { SPOT_BY_ID } from "@/lib/data";

export const metadata: Metadata = {
  title: "Photo credits",
  description: "Who took the photos on The Local, and the licenses they're shared under.",
};

type Row = { key: string; file: string; title: string; author: string; license: StockPhoto["license"] };

export default function Credits() {
  const places: Row[] = Object.entries(PLACE_PHOTOS).flatMap(([id, list]) =>
    list.map((p) => ({ key: p.file, file: p.file, title: `${SPOT_BY_ID[id]?.name ?? id}: ${p.caption.toLowerCase()}`, author: p.author, license: p.license }))
  );
  const stock: Row[] = Object.entries(LIBRARY).map(([k, p]) => ({ key: k, file: p.file, title: p.dish.charAt(0).toUpperCase() + p.dish.slice(1), author: p.author, license: p.license }));

  return (
    <div className="credits">
      <header className="partners-top">
        <Link href="/" className="textbtn">
          ← Back to the map
        </Link>
        <span className="brand-script">The Local</span>
      </header>
      <p className="cap-kicker">Photo credits</p>
      <h1>Who took the pictures</h1>
      <p>
        Member photos come first on every page, credited to the member. Until a place has enough of them, we fill in with openly licensed photos from
        Wikimedia Commons. The ones of the dishes a place is known for are marked <span className="stock-tag">stock</span>, because they weren&rsquo;t
        taken there. Thanks to the photographers below.
      </p>

      <h2 className="menu-head">
        <span>Taken at the place</span>
      </h2>
      <Grid rows={places} />
      <h2 className="menu-head">
        <span>Stock, by dish</span>
      </h2>
      <Grid rows={stock} />
      <p>
        Shot one of these better at a place on the map? <Link href="/">Find it</Link> and add your photo. Yours goes up front.
      </p>
    </div>
  );
}

function Grid({ rows }: { rows: Row[] }) {
  return (
    <ul className="credit-grid">
      {rows.map((r) => (
        <li key={r.key}>
          <figure className="snap">
            <div className="snap-img">
              <Photo src={commonsSrc(r.file, 500)} srcSet={commonsSrcSet(r.file, [330, 500])} sizes="(max-width: 900px) 46vw, 230px" alt={r.title} />
            </div>
            <figcaption>
              <strong>{r.title}</strong>
              <a href={commonsPage(r.file)} target="_blank" rel="noreferrer">
                {r.author}
              </a>
              {", "}
              <a href={licenseUrl(r.license)} target="_blank" rel="noreferrer license">
                {r.license}
              </a>
            </figcaption>
          </figure>
        </li>
      ))}
    </ul>
  );
}
