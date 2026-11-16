import type { Metadata } from "next";
import { CommercialLanding } from "@/components/landing/commercial-landing";
import { landingEs } from "@/components/landing/content/es";
import { fetchPublicPlans } from "@/lib/public-plans";
import { siteUrl } from "@/lib/site-url";

/** Los planes se cachean una hora (`fetchPublicPlans`): la página se
 * regenera sola cuando cambia el catálogo, sin redeploy. */
export const revalidate = 3600;

export function generateMetadata(): Metadata {
  const { meta } = landingEs;
  const url = siteUrl();
  return {
    metadataBase: new URL(url),
    title: meta.title,
    description: meta.description,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      locale: "es_CO",
      url: "/",
      siteName: meta.siteName,
      title: meta.title,
      description: meta.description,
      images: [{ url: "/landing/og-image.jpg", width: 1200, height: 630, alt: meta.siteName }],
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
      images: ["/landing/og-image.jpg"],
    },
  };
}

export default async function Home() {
  const plans = await fetchPublicPlans();
  return <CommercialLanding content={landingEs} plans={plans} siteUrl={siteUrl()} />;
}
