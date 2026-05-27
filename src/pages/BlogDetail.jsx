import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeftIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import api from "../utils/api";
import useSEO from "../hooks/useSEO";
import { SITE_PUBLIC_URL } from "../config";

const fallbackImage = "/og-image.png";

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

  const SeoComponent = useSEO({
    title: post ? `${title} | Pyonea Blog` : t("blog_page.title"),
    description,
    image: post?.featured_image || fallbackImage,
    imageAlt: post ? `${displayTitle} - Myanmar B2B wholesale guide` : undefined,
    url: post ? `/blog/${post.slug}` : `/blog/${slug}`,
    type: "article",
    schema: post ? {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: displayTitle,
      description,
      image: post.featured_image || `${SITE_PUBLIC_URL}${fallbackImage}`,
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
      mainEntityOfPage: `${SITE_PUBLIC_URL}/blog/${post.slug}`,
    } : null,
  });

  if (loading) {
    return (
      <>
        {SeoComponent}
        <div className="mx-auto max-w-4xl px-4 py-16">
          <div className="h-8 w-36 animate-pulse rounded bg-gray-200 dark:bg-slate-800" />
          <div className="mt-8 h-96 animate-pulse rounded-lg bg-gray-200 dark:bg-slate-800" />
        </div>
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
              <h1 className="mt-4 text-3xl font-bold leading-tight text-gray-950 dark:text-white sm:text-5xl">
                {displayTitle}
              </h1>
              <p className="mt-5 text-lg leading-8 text-gray-600 dark:text-slate-400">
                {loc(post.excerpt_en, post.excerpt_mm)}
              </p>
            </div>
          </div>

          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <img
              src={post.featured_image || fallbackImage}
              alt={`${displayTitle} - Pyonea Myanmar business guide`}
              className="aspect-[16/7] w-full rounded-lg object-cover"
              onError={(event) => { event.currentTarget.src = fallbackImage; }}
            />
          </div>

          <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
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
