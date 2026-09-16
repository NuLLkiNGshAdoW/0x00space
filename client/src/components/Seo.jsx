import { useEffect } from "react";

const SITE_URL = import.meta.env.VITE_SITE_URL || "https://0x00space.vercel.app";
const DEFAULT_IMAGE = `${SITE_URL}/brand-logo-transparent.png`;

export default function Seo({ title, description, path = "/", image = DEFAULT_IMAGE, type = "website", structuredData }) {
  useEffect(() => {
    const canonical = new URL(path, `${SITE_URL}/`).href;
    document.title = title;

    setMeta("description", description);
    setMeta("og:title", title, "property");
    setMeta("og:description", description, "property");
    setMeta("og:type", type, "property");
    setMeta("og:url", canonical, "property");
    setMeta("og:image", image, "property");
    setMeta("og:image:alt", "0x00 SPACE — игровой канал", "property");
    setMeta("og:image:type", "image/png", "property");
    setMeta("twitter:title", title);
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:description", description);
    setMeta("twitter:image", image);
    setLink("canonical", canonical);

    let jsonLd = document.head.querySelector('script[data-seo-jsonld="true"]');
    if (structuredData) {
      if (!jsonLd) {
        jsonLd = document.createElement("script");
        jsonLd.type = "application/ld+json";
        jsonLd.dataset.seoJsonld = "true";
        document.head.appendChild(jsonLd);
      }
      jsonLd.textContent = JSON.stringify(structuredData);
    } else if (jsonLd) {
      jsonLd.remove();
    }

    return () => jsonLd?.remove();
  }, [description, image, path, structuredData, title, type]);

  return null;
}

function setMeta(name, content, attribute = "name") {
  let element = document.head.querySelector(`meta[${attribute}="${name}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

function setLink(rel, href) {
  let element = document.head.querySelector(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
}
