import type { Localized, ProductColor } from "./schema.js";

const C: Record<string, ProductColor> = {
  ivory: { key: "ivory", name: { en: "Ivory", ar: "عاجي" }, hex: "#efe7d8" },
  sand: { key: "sand", name: { en: "Sand", ar: "رملي" }, hex: "#d3bd98" },
  nile: { key: "nile", name: { en: "Nile green", ar: "أخضر نيلي" }, hex: "#2f5d62" },
  terracotta: { key: "terracotta", name: { en: "Terracotta", ar: "تيراكوتا" }, hex: "#b5573a" },
  olive: { key: "olive", name: { en: "Olive", ar: "زيتوني" }, hex: "#6b6b3a" },
  indigo: { key: "indigo", name: { en: "Indigo", ar: "نيلي" }, hex: "#2c3e66" },
  charcoal: { key: "charcoal", name: { en: "Charcoal", ar: "فحمي" }, hex: "#3a3a3c" },
  rose: { key: "rose", name: { en: "Dusty rose", ar: "وردي هادي" }, hex: "#c98b86" },
  black: { key: "black", name: { en: "Black", ar: "أسود" }, hex: "#1c1c1e" },
  sky: { key: "sky", name: { en: "Light wash", ar: "غسلة فاتحة" }, hex: "#9cb3c9" },
  forest: { key: "forest", name: { en: "Forest green", ar: "أخضر غامق" }, hex: "#2f4a3a" },
  burgundy: { key: "burgundy", name: { en: "Burgundy", ar: "نبيتي" }, hex: "#6b1f2b" },
  heather: { key: "heather", name: { en: "Heather grey", ar: "رمادي فاتح" }, hex: "#b8b6b3" },
  tobacco: { key: "tobacco", name: { en: "Tobacco", ar: "بني دخاني" }, hex: "#8a5530" },
};

export const PALETTE = Object.values(C);
export const CLOTHING_SIZES = ["XS", "S", "M", "L", "XL"];
export const ONE_SIZE = ["One size"];

export type SeedProduct = {
  slug: string;
  name: Localized;
  description: Localized;
  category: string;
  garment: string;
  fabric: string;
  pattern: string;
  price: number;
  compareAt?: number;
  colors: ProductColor[];
  sizes: string[];
  images?: Record<string, string>;
  swatches?: Record<string, string>;
  featured?: boolean;
};

const egp = (value: number) => value * 100;

const photo = (name: string) => `/products/${name}.webp`;
const cloth = (name: string) => `/fabrics/${name}.webp`;

export const CATALOGUE: SeedProduct[] = [
  {
    slug: "fleece-hoodie",
    name: { en: "Heavy Fleece Hoodie", ar: "هودي فليس تقيل" },
    description: { en: "A relaxed, heavyweight hoodie in brushed cotton fleece, with a lined hood and a deep kangaroo pocket.", ar: "هودي تقيل بقصّة مريحة من فليس قطن ناعم من جوّه، بكابيشون مبطّن وجيب كانجرو واسع." },
    category: "tops",
    garment: "hoodie",
    fabric: "cotton",
    pattern: "solid",
    price: egp(1250),
    colors: [C.ivory!, C.charcoal!, C.forest!, C.heather!, C.indigo!],
    sizes: CLOTHING_SIZES,
    images: { ivory: photo("hoodie-ivory"), charcoal: photo("hoodie-charcoal"), forest: photo("hoodie-forest"), heather: photo("hoodie-heather"), indigo: photo("hoodie-indigo") },
    swatches: { ivory: cloth("fleece-ivory"), charcoal: cloth("washed-charcoal"), forest: cloth("terry-forest"), heather: cloth("brushed-heather") },
    featured: true,
  },
  {
    slug: "satin-puff-dress",
    name: { en: "Satin Puff-Sleeve Dress", ar: "فستان ساتان بأكمام منفوخة" },
    description: { en: "A square neckline, softly gathered puff sleeves and a full circle skirt in fluid satin.", ar: "رقبة مربعة وأكمام منفوخة مكشكشة بهدوء وجيبة واسعة من ساتان انسيابي." },
    category: "dresses",
    garment: "dress",
    fabric: "silk",
    pattern: "solid",
    price: egp(2650),
    colors: [C.burgundy!],
    sizes: CLOTHING_SIZES,
    images: { burgundy: photo("dress-burgundy") },
    swatches: { burgundy: cloth("satin-burgundy") },
    featured: true,
  },
  {
    slug: "denim-trucker-jacket",
    name: { en: "Denim Trucker Jacket", ar: "جاكت جينز" },
    description: { en: "The classic trucker in sturdy washed denim, with flap pockets and metal shank buttons.", ar: "الجاكت الجينز الكلاسيك من جينز مغسول متين، بجيوب بغطا وزراير معدن." },
    category: "outerwear",
    garment: "jacket",
    fabric: "denim",
    pattern: "solid",
    price: egp(2100),
    colors: [C.indigo!, C.black!, C.ivory!],
    sizes: CLOTHING_SIZES,
    images: { indigo: photo("jacket-indigo"), black: photo("jacket-black"), ivory: photo("jacket-ivory") },
    swatches: { indigo: cloth("denim-indigo") },
    featured: true,
  },
  {
    slug: "oversized-cotton-tee",
    name: { en: "Oversized Cotton Tee", ar: "تيشيرت قطن واسع" },
    description: { en: "Heavyweight Giza cotton jersey with dropped shoulders and a clean ribbed collar.", ar: "جيرسيه قطن جيزة تقيل بكتف نازل ورقبة ريب مظبوطة." },
    category: "tops",
    garment: "tee",
    fabric: "cotton",
    pattern: "solid",
    price: egp(550),
    colors: [C.ivory!, C.black!, C.forest!],
    sizes: CLOTHING_SIZES,
    images: { ivory: photo("tee-ivory"), black: photo("tee-black"), forest: photo("tee-forest") },
    swatches: { ivory: cloth("jersey-ivory"), black: cloth("washed-black"), forest: cloth("jersey-forest") },
    featured: true,
  },
  {
    slug: "floral-poplin-dress",
    name: { en: "Floral Poplin Dress", ar: "فستان بوبلين مورّد" },
    description: { en: "Crisp cotton poplin printed with small blue flowers, with puff sleeves and a smocked bodice.", ar: "بوبلين قطن مطبوع بورد أزرق صغير، بأكمام منفوخة وصدر مكشكش." },
    category: "dresses",
    garment: "dress",
    fabric: "cotton",
    pattern: "dots",
    price: egp(1950),
    colors: [C.ivory!],
    sizes: CLOTHING_SIZES,
    images: { ivory: photo("dress-floral") },
    swatches: { ivory: cloth("poplin-floral") },
    featured: true,
  },
  {
    slug: "wide-leg-jeans",
    name: { en: "Wide-Leg Jeans", ar: "جينز رجل واسعة" },
    description: { en: "High-rise, relaxed through the hip and wide all the way down, in rigid cotton denim.", ar: "وسط عالي، مريح عند الوسط وواسع لحد تحت، من جينز قطن خام." },
    category: "trousers",
    garment: "trousers",
    fabric: "denim",
    pattern: "solid",
    price: egp(1650),
    colors: [C.sky!, C.indigo!, C.black!],
    sizes: CLOTHING_SIZES,
    images: { sky: photo("jeans-sky"), indigo: photo("jeans-indigo"), black: photo("jeans-black") },
    swatches: { sky: cloth("denim-indigo"), indigo: cloth("denim-indigo") },
    featured: true,
  },
  {
    slug: "linen-shirt-dress",
    name: { en: "Linen Shirt Dress", ar: "فستان قميص كتان" },
    description: { en: "A long-sleeve shirt dress in washed linen, buttoned all the way down with a tie waist.", ar: "فستان قميص بكم طويل من كتان مغسول، بزراير لآخره وحزام بيتربط." },
    category: "dresses",
    garment: "dress",
    fabric: "linen",
    pattern: "solid",
    price: egp(2200),
    colors: [C.olive!],
    sizes: CLOTHING_SIZES,
    images: { olive: photo("dress-olive") },
    swatches: { olive: cloth("linen-olive") },
    featured: true,
  },
  {
    slug: "pleated-wool-trousers",
    name: { en: "Pleated Wool Trousers", ar: "بنطلون صوف بكسرات" },
    description: { en: "Front pleats, a high waist and a long, wide leg in soft wool-blend twill.", ar: "كسرات قدام ووسط عالي ورجل طويلة واسعة من تويل صوف ناعم." },
    category: "trousers",
    garment: "trousers",
    fabric: "wool",
    pattern: "solid",
    price: egp(1850),
    colors: [C.sand!, C.black!, C.charcoal!],
    sizes: CLOTHING_SIZES,
    images: { sand: photo("trousers-sand"), black: photo("trousers-black"), charcoal: photo("trousers-charcoal") },
    swatches: { sand: cloth("linen-sand"), charcoal: cloth("wool-charcoal") },
    featured: true,
  },
  {
    slug: "classic-crepe-dress",
    name: { en: "Classic Crepe Dress", ar: "فستان كريب كلاسيك" },
    description: { en: "Long bishop sleeves, a belted waist and a full skirt in matte wool crepe.", ar: "أكمام طويلة واسعة ووسط بحزام وجيبة واسعة من كريب صوف مطفي." },
    category: "dresses",
    garment: "dress",
    fabric: "wool",
    pattern: "solid",
    price: egp(2450),
    colors: [C.black!],
    sizes: CLOTHING_SIZES,
    images: { black: photo("dress-black") },
    swatches: { black: cloth("crepe-black") },
    featured: true,
  },
  {
    slug: "cord-trucker-jacket",
    name: { en: "Cord Trucker Jacket", ar: "جاكت قطيفة مضلّعة" },
    description: { en: "Our trucker cut in soft cotton corduroy, warm enough for Cairo winters.", ar: "نفس قصّة الجاكت الكلاسيك من قطيفة قطن مضلّعة ناعمة، دافية كفاية لشتا القاهرة." },
    category: "outerwear",
    garment: "jacket",
    fabric: "cotton",
    pattern: "stripe",
    price: egp(2350),
    compareAt: egp(2700),
    colors: [C.tobacco!],
    sizes: CLOTHING_SIZES,
    images: { tobacco: photo("jacket-tobacco") },
    swatches: { tobacco: cloth("corduroy-tobacco") },
  },
  {
    slug: "breton-stripe-tee",
    name: { en: "Breton Stripe Tee", ar: "تيشيرت مقلّم" },
    description: { en: "Navy stripes knitted into soft combed cotton, with a slightly boxy fit.", ar: "خطوط كحلي منسوجة في قطن ممشّط ناعم، بقصّة واسعة شوية." },
    category: "tops",
    garment: "tee",
    fabric: "cotton",
    pattern: "stripe",
    price: egp(650),
    compareAt: egp(750),
    colors: [C.indigo!],
    sizes: CLOTHING_SIZES,
    images: { indigo: photo("tee-stripe") },
    swatches: { indigo: cloth("pique-stripe") },
  },
];
