import { useEffect } from "react";
import { absoluteUrl, buildTitle, truncateDescription } from "@/lib/pageMeta";

export interface PageMetaOptions {
  title: string;
  description?: string;
  image?: string;
  path?: string;
  noindex?: boolean;
}

type Restore = () => void;

function setMeta(attr: "name" | "property", key: string, content: string): Restore {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  const created = !el;
  const prev = el?.getAttribute("content") ?? null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
  return () => {
    if (!el) return;
    if (created) el.remove();
    else if (prev !== null) el.setAttribute("content", prev);
  };
}

function setCanonical(href: string): Restore {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  const created = !el;
  const prev = el?.getAttribute("href") ?? null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
  return () => {
    if (!el) return;
    if (created) el.remove();
    else if (prev !== null) el.setAttribute("href", prev);
  };
}

export function usePageMeta({ title, description, image, path, noindex }: PageMetaOptions): void {
  useEffect(() => {
    const origin = window.location.origin;
    const fullTitle = buildTitle(title);
    const desc = description ? truncateDescription(description) : undefined;
    const url = absoluteUrl(path ?? window.location.pathname, origin);
    const img = image ? absoluteUrl(image, origin) : undefined;

    const prevTitle = document.title;
    document.title = fullTitle;
    const restores: Restore[] = [];
    restores.push(setCanonical(url));
    restores.push(setMeta("property", "og:title", fullTitle));
    restores.push(setMeta("property", "og:url", url));
    restores.push(setMeta("property", "og:type", "website"));
    restores.push(setMeta("name", "twitter:title", fullTitle));
    restores.push(setMeta("name", "twitter:card", img ? "summary_large_image" : "summary"));
    if (desc) {
      restores.push(setMeta("name", "description", desc));
      restores.push(setMeta("property", "og:description", desc));
      restores.push(setMeta("name", "twitter:description", desc));
    }
    if (img) {
      restores.push(setMeta("property", "og:image", img));
      restores.push(setMeta("name", "twitter:image", img));
    }
    if (noindex) restores.push(setMeta("name", "robots", "noindex, nofollow"));

    return () => {
      document.title = prevTitle;
      restores.reverse().forEach((r) => r());
    };
  }, [title, description, image, path, noindex]);
}
