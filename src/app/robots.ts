import type { MetadataRoute } from "next";

// Do NOT add the hidden Intentional Ministries admin address here — listing
// it in robots.txt would publish it. That page is protected with a noindex
// tag and header instead.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/fullcount", "/api/"] }],
  };
}
