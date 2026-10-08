import {
  ChefHat,
  Coffee,
  Croissant,
  Drumstick,
  Fish,
  Flame,
  IceCreamCone,
  Martini,
  Pizza,
  Salad,
  Soup,
  Sun,
  UtensilsCrossed,
  type LucideProps,
} from "lucide-react";

const MAP = {
  drumstick: Drumstick,
  flame: Flame,
  pizza: Pizza,
  fish: Fish,
  sun: Sun,
  soup: Soup,
  salad: Salad,
  chef: ChefHat,
  croissant: Croissant,
  coffee: Coffee,
  icecream: IceCreamCone,
  martini: Martini,
  all: UtensilsCrossed,
} as const;

export function GenreIcon({ name, ...rest }: { name: string } & LucideProps) {
  const C = MAP[name as keyof typeof MAP] ?? UtensilsCrossed;
  return <C {...rest} />;
}
