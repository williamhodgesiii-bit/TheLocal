/** "Get the handmade pasta" / "Get a bowl of ramen": the order, as a sentence, without "the the" */
export function getThe(knownFor?: string | null) {
  const k = (knownFor ?? "").trim();
  if (!k) return "";
  const low = k.charAt(0).toLowerCase() + k.slice(1);
  return /^(the|a|an|one|two|any|whatever)\s/i.test(k) ? `Get ${low}` : `Get the ${low}`;
}

