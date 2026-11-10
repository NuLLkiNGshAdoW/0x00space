export const SITE_URL = (import.meta.env.VITE_SITE_URL || "https://0x00space.vercel.app").replace(
  /\/+$/,
  "",
);
export const SITE_NAME = "0x00 SPACE";

export function absoluteUrl(path = "/") {
  return new URL(path, `${SITE_URL}/`).href;
}

export function organizationRef() {
  return {
    "@type": "Organization",
    name: SITE_NAME,
    url: absoluteUrl("/"),
    logo: absoluteUrl("/brand-mark.png"),
  };
}

export function breadcrumbSchema(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
