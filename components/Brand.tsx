import { BRAND } from "@/lib/brand";

/**
 * The mark: a diner plate with a red band, and a front door on it.
 * The plate is the food; the door is the neighbor's.
 */
export function PlateMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" width={size} height={size} aria-hidden>
      <circle cx="24" cy="24" r="22.6" fill="#FBF8EF" stroke="#22201C" strokeWidth="1.6" />
      <circle cx="24" cy="24" r="18.4" fill="none" stroke="#B23A24" strokeWidth="2.4" />
      <circle cx="24" cy="24" r="14.6" fill="none" stroke="#22201C" strokeOpacity=".22" strokeWidth="1" />
      <path d="M17.2 33.4V22.6a6.8 6.8 0 0 1 13.6 0v10.8" fill="none" stroke="#22201C" strokeWidth="1.3" />
      <path d="M19.2 33.4V22.8a4.8 4.8 0 0 1 9.6 0v10.6Z" fill="#B23A24" />
      <path d="M20.6 22.6a3.4 3.4 0 0 1 6.8 0Z" fill="#FBF8EF" />
      <circle cx="26.4" cy="28.6" r="1" fill="#FBF8EF" />
      <path d="M15.4 33.8h17.2" stroke="#22201C" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** Mark + name, as it sits in a page header. */
export function Logo({ size = 40, sub }: { size?: number; sub?: string }) {
  return (
    <span className="logo">
      <PlateMark size={size} className="logo-mark" />
      <span className="logo-name">{BRAND}</span>
      {sub && <span className="logo-sub">{sub}</span>}
    </span>
  );
}
