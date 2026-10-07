// Menu and footer links for the Intentional Ministries door. These mirror the
// main website (www.intentionalministries.com) so the two feel like one place.
export const IM_SITE = "https://www.intentionalministries.com";
export const IM_TAGLINE =
  "Equipping people to live intentionally in faith, relationships, and life.";

export interface ImNavItem {
  label: string;
  href: string;
  series?: "discipleship" | "marriage";
}

export const imMainNav: ImNavItem[] = [
  { label: "Discipleship", href: `${IM_SITE}/discipleship`, series: "discipleship" },
  { label: "Marriage", href: `${IM_SITE}/marriage`, series: "marriage" },
  { label: "Resources", href: `${IM_SITE}/resources` },
  { label: "About", href: `${IM_SITE}/about` },
  { label: "Contact", href: `${IM_SITE}/contact` },
];

export const imFooterNav: { heading: string; items: ImNavItem[] }[] = [
  {
    heading: "Discipleship",
    items: [
      { label: "Discipleship", href: `${IM_SITE}/discipleship` },
      {
        label: "Intentional Discipleship",
        href: `${IM_SITE}/discipleship/intentional-discipleship`,
      },
    ],
  },
  {
    heading: "Marriage",
    items: [
      { label: "Marriage", href: `${IM_SITE}/marriage` },
      { label: "Intentional Marriage", href: `${IM_SITE}/marriage/intentional-marriage` },
    ],
  },
  {
    heading: "More",
    items: [
      { label: "Resources", href: `${IM_SITE}/resources` },
      { label: "About", href: `${IM_SITE}/about` },
      { label: "Contact", href: `${IM_SITE}/contact` },
      { label: "Main website", href: IM_SITE },
    ],
  },
];
