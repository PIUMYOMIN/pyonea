import { Helmet } from "react-helmet-async";
import { SITE_PUBLIC_URL } from "../../config";

const SEO = ({
  title,
  description,
  image,
  url = "",
  type = "website",
  imageAlt = "",
  schema = null,
  alternateUrls = {},
  noindex = false,
  locale = "en_US",
}) => {

  const siteUrl = SITE_PUBLIC_URL;

  const safeImage = (image != null && image !== "") ? image : "/og-image.png";
  const safeUrl   = url ?? "";

  const fullTitle = title
    ? title.includes("Pyonea")
      ? title
      : `${title} | Pyonea`
    : "Pyonea | Myanmar B2B Wholesale Marketplace";

  const absoluteImage = safeImage.startsWith("http")
    ? safeImage
    : `${siteUrl}${safeImage}`;

  const absoluteUrl = safeUrl.startsWith("http")
    ? safeUrl
    : `${siteUrl}${safeUrl}`;

  // Auto-generate ?lang= alternates when caller doesn't provide explicit ones.
  // Strips any existing ?lang= first to avoid ?lang=en&lang=my duplicates.
  const buildLangUrl = (base, lang) => {
    try {
      const u = new URL(base);
      u.searchParams.set("lang", lang);
      return u.toString();
    } catch {
      const stripped = base.replace(/([?&])lang=[^&]*/g, "").replace(/[?&]$/, "");
      const sep = stripped.includes("?") ? "&" : "?";
      return `${stripped}${sep}lang=${lang}`;
    }
  };

  const effectiveAlternates = Object.keys(alternateUrls).length > 0
    ? alternateUrls
    : {
        en: buildLangUrl(absoluteUrl, "en"),
        my: buildLangUrl(absoluteUrl, "my"),
      };

  // Map lang code → og:locale value
  const ogLocaleMap = { en: "en_US", my: "my_MM" };
  const ogLocaleAlternates = Object.keys(effectiveAlternates)
    .filter((lang) => ogLocaleMap[lang] && ogLocaleMap[lang] !== locale)
    .map((lang) => ogLocaleMap[lang]);

  return (
    <Helmet>
      <title>{fullTitle}</title>

      <meta name="description" content={description || ""} />

      <link rel="canonical" href={absoluteUrl} />

      {/* hreflang — one link per supported language */}
      {Object.entries(effectiveAlternates).map(([lang, href]) => (
        <link key={lang} rel="alternate" hrefLang={lang} href={href} />
      ))}

      {/* x-default points to the English version */}
      <link
        rel="alternate"
        hrefLang="x-default"
        href={effectiveAlternates.en || siteUrl}
      />

      {/* Open Graph */}
      <meta property="og:type"        content={type} />
      <meta property="og:title"       content={fullTitle} />
      <meta property="og:description" content={description || ""} />
      <meta property="og:image"       content={absoluteImage} />
      <meta property="og:image:secure_url" content={absoluteImage} />
      {imageAlt ? <meta property="og:image:alt" content={imageAlt} /> : null}
      <meta property="og:image:width"  content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:url"         content={absoluteUrl} />
      <meta property="og:site_name"   content="Pyonea" />
      <meta property="og:locale"      content={locale} />
      {/* og:locale:alternate lists the other available language */}
      {ogLocaleAlternates.map((alt) => (
        <meta key={alt} property="og:locale:alternate" content={alt} />
      ))}

      {/* Twitter */}
      <meta name="twitter:card"        content="summary_large_image" />
      <meta name="twitter:site"        content="@PyoneaMarket" />
      <meta name="twitter:title"       content={fullTitle} />
      <meta name="twitter:description" content={description || ""} />
      <meta name="twitter:image"       content={absoluteImage} />
      {imageAlt ? <meta name="twitter:image:alt" content={imageAlt} /> : null}

      {/* noindex */}
      {noindex && (
        <meta name="robots" content="noindex,nofollow" />
      )}

      {/* JSON-LD */}
      {schema && (
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;
