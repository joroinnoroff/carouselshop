/**
 * The catalogue. Today this is a hard-coded list; when the admin panel lands
 * this module is the single place that has to start reading from the database.
 *
 * Prices climb in 100 kr steps from the smallest posy to the largest wrap.
 */

export type Bouquet = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  /** Price in øre, so we never do float maths on money. */
  priceOre: number;
  /** Photo in /public. */
  image: string;
  imageAlt: string;
  available: boolean;
};

export const BOUQUETS: Bouquet[] = [
  {
    id: "hverdag",
    name: "Small",
    tagline: "Everyday",
    description:
      "A compact seasonal bouquet. For the table or a simple gift.",
    priceOre: 30000,
    image: "/flower2.webp",
    imageAlt:
      "A small bouquet of pink peonies, coral roses and lilac sweet peas held against a pink brick wall",
    available: true,
  },
  {
    id: "sommer",
    name: "Medium",
    tagline: "Seasonal",
    description:
      "A loosely tied bouquet of the day's best stems.",
    priceOre: 40000,
    image: "/flower1.webp",
    imageAlt:
      "A loose pastel summer bouquet with pink and cream dahlias, daisies and yellow peonies, held up in the street",
    available: true,
  },
  {
    id: "grunersgate",
    name: "Large",
    tagline: "Signature",
    description:
      "Hydrangea, roses and seasonal foliage, wrapped for collection.",
    priceOre: 50000,
    image: "/flower3.webp",
    imageAlt:
      "A large bouquet of cream hydrangea, roses and dusty pink astilbe wrapped in peach paper",
    available: true,
  },
  {
    id: "karusell",
    name: "Ekstra Large",
    tagline: "Occasion",
    description:
      "A generous arrangement for celebrations. Florist's choice.",
    priceOre: 60000,
    image: "/flower4.webp",
    imageAlt:
      "A big coral and pink bouquet with anthurium, roses and snapdragons wrapped in orange tissue",
    available: true,
  },
];

export function getBouquet(id: string): Bouquet | undefined {
  return BOUQUETS.find((b) => b.id === id);
}

export function formatNok(ore: number): string {
  const kr = ore / 100;
  const hasOre = ore % 100 !== 0;
  return `${kr.toLocaleString("nb-NO", {
    minimumFractionDigits: hasOre ? 2 : 0,
    maximumFractionDigits: hasOre ? 2 : 0,
  })} kr`;
}
