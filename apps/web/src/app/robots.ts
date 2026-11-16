import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

/** Solo la landing se indexa: los paneles requieren sesión. */
export default function robots(): MetadataRoute.Robots {
  const url = siteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/doctor", "/patient", "/moderador", "/administrador", "/api", "/ingresar"],
    },
    sitemap: `${url}/sitemap.xml`,
  };
}
