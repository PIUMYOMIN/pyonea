import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  LinkIcon,
  ShareIcon,
} from "@heroicons/react/24/outline";
import api from "../utils/api";
import useSEO from "../hooks/useSEO";
import { IMAGE_BASE_URL, SITE_PUBLIC_URL } from "../config";
import { SkeletonBlogDetail } from "../components/ui/Skeleton";

const fallbackImage = "/og-image.png";

const toAbsoluteUrl = (url) => {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${SITE_PUBLIC_URL}${url.startsWith("/") ? "" : "/"}${url}`;
};

const resolveImageUrl = (image) => {
  if (!image) return fallbackImage;
  if (/^https?:\/\//i.test(image) || image.startsWith("/")) return image;
  return `${IMAGE_BASE_URL.replace(/\/+$/, "")}/${String(image).replace(/^\/+/, "")}`;
};

const paragraphize = (text = "") =>
  String(text)
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

const readingTime = (text = "") => {
  const words = String(text).trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
};

const BlogDetail = () => {
  const { slug } = useParams();
  const { t, i18n } = useTranslation();
  const [post, setPost] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const loc = (en, mm) => (i18n.language === "my" ? (mm || en) : (en || mm));

  useEffect(() => {
    let cancelled = false;
    const fetchPost = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(`/blog/${slug}`);
        if (cancelled) return;
        setPost(res.data?.data || null);
        setRelated(res.data?.related || []);
      } catch {
        if (!cancelled) setError(t("blog_page.detail_fetch_error"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchPost();
    return () => { cancelled = true; };
  }, [slug, t]);

  const title = post ? loc(post.seo_title_en || post.title_en, post.seo_title_mm || post.title_mm) : t("blog_page.title");
  const displayTitle = post ? loc(post.title_en, post.title_mm) : "";
  const description = post
    ? loc(post.seo_description_en || post.excerpt_en, post.seo_description_mm || post.excerpt_mm)
    : t("blog_page.seo.description");
  const content = post ? loc(post.content_en, post.content_mm) : "";
  const paragraphs = useMemo(() => paragraphize(content), [content]);
  const minutes = readingTime(content);
  const heroImage = resolveImageUrl(post?.featured_image);
  const absoluteHeroImage = toAbsoluteUrl(heroImage);
  const articleUrl = post ? `${SITE_PUBLIC_URL}/blog/${post.slug}` : `${SITE_PUBLIC_URL}/blog/${slug}`;
  const shareText = post ? t("blog_page.share_text", { title: displayTitle }) : "";
  const shareLinks = useMemo(() => {
    if (!post) return [];
    const enc = encodeURIComponent;
    const url = articleUrl;

    return [
      {
        label: "Facebook",
        icon: "f",
        href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
        className: "hover:border-blue-200 hover:bg-blue-50 dark:hover:border-blue-900/60 dark:hover:bg-blue-900/20",
      },
      {
        label: "WhatsApp",
        icon: "W",
        href: `https://wa.me/?text=${enc(`${shareText} ${url}`)}`,
        className: "hover:border-green-200 hover:bg-green-50 dark:hover:border-green-900/60 dark:hover:bg-green-900/20",
      },
      {
        label: "Telegram",
        icon: "T",
        href: `https://t.me/share/url?url=${enc(url)}&text=${enc(shareText)}`,
        className: "hover:border-sky-200 hover:bg-sky-50 dark:hover:border-sky-900/60 dark:hover:bg-sky-900/20",
      },
      {
        label: "LinkedIn",
        icon: "in",
        href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`,
        className: "hover:border-blue-200 hover:bg-blue-50 dark:hover:border-blue-900/60 dark:hover:bg-blue-900/20",
      },
      {
        label: "X",
        icon: "X",
        href: `https://x.com/intent/tweet?text=${enc(shareText)}&url=${enc(url)}`,
        className: "hover:border-gray-300 hover:bg-gray-100 dark:hover:border-slate-600 dark:hover:bg-slate-800",
      },
    ];
  }, [articleUrl, post, shareText]);

  const handleNativeShare = async () => {
    if (!post) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: displayTitle, text: shareText, url: articleUrl });
        return;
      } catch {
        // User cancelled or the platform rejected the share payload.
      }
    }

    try {
      await navigator.clipboard.writeText(articleUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard may be unavailable in older browsers or insecure contexts.
    }
  };

  const SeoComponent = useSEO({
    title: post ? `${title} | Pyonea Blog` : t("blog_page.title"),
    description,
    image: absoluteHeroImage || fallbackImage,
    imageAlt: post ? `${displayTitle} - Myanmar B2B wholesale guide` : undefined,
    url: post ? `/blog/${post.slug}` : `/blog/${slug}`,
    type: "article",
    schema: post ? {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: displayTitle,
      description,
      image: absoluteHeroImage || `${SITE_PUBLIC_URL}${fallbackImage}`,
      datePublished: post.published_at,
      dateModified: post.updated_at,
      author: {
        "@type": "Person",
        name: post.author?.name || "Pyonea",
      },
      publisher: {
        "@type": "Organization",
        name: "Pyonea",
        logo: {
          "@type": "ImageObject",
          url: `${SITE_PUBLIC_URL}/logo.png`,
        },
      },
      mainEntityOfPage: articleUrl,
    } : null,
  });

  if (loading) {
    return (
      <>
        {SeoComponent}
        <SkeletonBlogDetail />
      </>
    );
  }

  if (error || !post) {
    return (
      <>
        {SeoComponent}
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-gray-950 dark:text-white">{t("blog_page.not_found")}</h1>
          <p className="mt-3 text-gray-600 dark:text-slate-400">{error || t("blog_page.not_found_subtitle")}</p>
          <Link to="/blog" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700">
            <ArrowLeftIcon className="h-4 w-4" />
            {t("blog_page.back_to_blog")}
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      {SeoComponent}
      <main className="bg-white dark:bg-slate-950">
        <article>
          <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
            <Link to="/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-green-700 hover:text-green-800 dark:text-green-300">
              <ArrowLeftIcon className="h-4 w-4" />
              {t("blog_page.back_to_blog")}
            </Link>
            <div className="mt-8">
              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
                {post.category && (
                  <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                    {post.category}
                  </span>
                )}
                <span>{minutes} {t("blog_page.min_read")}</span>
                {post.published_at && (
                  <span>{new Date(post.published_at).toLocaleDateString(i18n.language === "my" ? "my-MM" : "en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
                )}
              </div>
              <h1 className="mt-4 mb-2 text-3xl font-bold leading-tight text-gray-950 dark:text-white sm:text-5xl">
                {displayTitle}
              </h1>
            </div>
          </div>

          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <img
              src={heroImage}
              alt={`${displayTitle} - Pyonea Myanmar business guide`}
              className="aspect-[16/7] w-full rounded-lg object-cover"
              width="1200"
              height="525"
              sizes="(min-width: 1024px) 1152px, calc(100vw - 32px)"
              loading="eager"
              fetchPriority="high"
              decoding="async"
              onError={(event) => {
                if (event.currentTarget.src !== toAbsoluteUrl(fallbackImage)) {
                  event.currentTarget.src = fallbackImage;
                }
              }}
            />
          </div>

          <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-col gap-3 border-b border-gray-100 pb-6 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-300">
                <ShareIcon className="h-4 w-4" />
                {t("blog_page.share_article")}
              </div>
              <div className="flex flex-wrap gap-2">
                {shareLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${t("blog_page.share_on")} ${link.label}`}
                    className={`inline-flex h-9 items-center gap-2 rounded-md border border-gray-200 px-3 text-sm font-semibold text-gray-700 transition dark:border-slate-700 dark:text-slate-200 ${link.className}`}
                  >
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-100 px-1 text-[10px] font-bold text-gray-800 dark:bg-slate-700 dark:text-slate-100">
                      {link.icon}
                    </span>
                    <span>{link.label}</span>
                  </a>
                ))}
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-gray-200 px-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {copied ? <CheckIcon className="h-4 w-4 text-green-600" /> : <LinkIcon className="h-4 w-4" />}
                  {copied ? t("blog_page.copied") : t("blog_page.copy_link")}
                </button>
              </div>
            </div>

            <div className="prose prose-gray max-w-none dark:prose-invert">
              {paragraphs.map((paragraph, index) => (
                <p key={index} className="whitespace-pre-line text-base leading-8 text-gray-700 dark:text-slate-300">
                  {paragraph}
                </p>
              ))}
            </div>

            {post.tags?.length > 0 && (
              <div className="mt-10 flex flex-wrap gap-2 border-t border-gray-100 pt-6 dark:border-slate-800">
                {post.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-slate-800 dark:text-slate-300">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </article>

        {related.length > 0 && (
          <section className="border-t border-gray-100 bg-gray-50 py-10 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <h2 className="text-xl font-bold text-gray-950 dark:text-white">{t("blog_page.related")}</h2>
              <div className="mt-5 grid gap-5 md:grid-cols-3">
                {related.map((item) => (
                  <Link key={item.id} to={`/blog/${item.slug}`} className="rounded-lg border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md dark:border-slate-800 dark:bg-slate-950">
                    <p className="text-xs font-semibold text-green-700 dark:text-green-300">{item.category || t("blog_page.label")}</p>
                    <h3 className="mt-2 line-clamp-2 font-semibold text-gray-950 dark:text-white">
                      {loc(item.title_en, item.title_mm)}
                    </h3>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-green-700 dark:text-green-300">
                      {t("blog_page.read_article")}
                      <ArrowRightIcon className="h-4 w-4" />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </>
  );
};

export default BlogDetail;
