import Script from "next/script";

const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID;
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID;
/** Los IDs solo traen letras, números y guiones: se validan antes de meterlos
 * en un script en línea. */
const SAFE_ID = /^[A-Za-z0-9-]+$/;

/** GA4 y Microsoft Clarity, solo en la landing y solo si hay ID en Vercel.
 * `lazyOnload`: cargan cuando la página ya está quieta, no compiten con el LCP. */
export function LandingAnalytics() {
  const ga4 = GA4_ID && SAFE_ID.test(GA4_ID) ? GA4_ID : null;
  const clarity = CLARITY_ID && SAFE_ID.test(CLARITY_ID) ? CLARITY_ID : null;

  return (
    <>
      {ga4 ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga4}`} strategy="lazyOnload" />
          <Script id="landing-ga4" strategy="lazyOnload">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${ga4}');`}
          </Script>
        </>
      ) : null}
      {clarity ? (
        <Script id="landing-clarity" strategy="lazyOnload">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${clarity}");`}
        </Script>
      ) : null}
    </>
  );
}
