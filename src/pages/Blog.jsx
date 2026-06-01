import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MagnifyingGlassIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import api from "../utils/api";
import useSEO from "../hooks/useSEO";
import { IMAGE_BASE_URL, SITE_PUBLIC_URL } from "../config";

const fallbackImage = "/og-image.png";

const resolveImageUrl = (image) => {
  if (!image) return fallbackImage;
  if (/^https?:\/\//i.test(image) || image.startsWith("/")) return image;
  return `${IMAGE_BASE_URL.replace(/\/+$/, "")}/${String(image).replace(/^\/+/, "")}`;
};

const readingTime = (text = "") => {
  const words = String(text).trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
};

const BlogCard = ({ post, loc, t }) => {
  const title = loc(post.title_en, post.title_mm);
  const excerpt = loc(post.excerpt_en, post.excerpt_mm);
  const minutes = readingTime(loc(post.content_en, post.content_mm) || excerpt);

  return (
    <article className="group overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <Link to={`/blog/${post.slug}`} className="block">
        <div className="aspect-[16/9] overflow-hidden bg-gray-100 dark:bg-slate-800">
          <img
            src={resolveImageUrl(post.featured_image)}
            alt={`${title} - Pyonea Myanmar wholesale guide`}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
            onError={(event) => { event.currentTarget.src = fallbackImage; }}
          />
        </div>
        <div className="space-y-3 p-5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
            {post.category && (
              <span className="rounded-full bg-green-50 px-2.5 py-1 font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
                {post.category}
              </span>
            )}
            <span>{minutes} {t("blog_page.min_read")}</span>
          </div>
          <h2 className="line-clamp-2 text-lg font-semibold text-gray-950 group-hover:text-green-700 dark:text-white dark:group-hover:text-green-300">
            {title}
          </h2>
          <p className="line-clamp-3 text-sm leading-6 text-gray-600 dark:text-slate-400">
            {excerpt}
          </p>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-green-700 dark:text-green-300">
            {t("blog_page.read_article")}
            <ArrowRightIcon className="h-4 w-4" />
          </span>
        </div>
      </Link>
    </article>
  );
};

const Blog = () => {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loc = (en, mm) => (i18n.language === "my" ? (mm || en) : (en || mm));

  const pageTitle = t("blog_page.seo.title");
  const pageDescription = t("blog_page.seo.description");
  const hasActiveFilters = Boolean(search.trim() || category);

  const SeoComponent = useSEO({
    title: pageTitle,
    description: pageDescription,
    url: "/blog",
    type: "website",
    noindex: hasActiveFilters,
    schema: {
      "@context": "https://schema.org",
      "@type": "Blog",
      name: pageTitle,
      description: pageDescription,
      url: `${SITE_PUBLIC_URL}/blog`,
    },
  });

  useEffect(() => {
    const next = {};
    if (search.trim()) next.search = search.trim();
    if (category) next.category = category;
    setSearchParams(next, { replace: true });
  }, [search, category, setSearchParams]);

  useEffect(() => {
    let cancelled = false;
    const fetchPosts = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get("/blog", {
          params: {
            per_page: 24,
            ...(search.trim() ? { search: search.trim() } : {}),
            ...(category ? { category } : {}),
          },
        });
        if (cancelled) return;
        setPosts(res.data?.data?.data || []);
        setCategories(res.data?.categories || []);
      } catch {
        if (!cancelled) setError(t("blog_page.fetch_error"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchPosts();
    return () => { cancelled = true; };
  }, [search, category, t]);

  const featured = useMemo(() => posts.find((post) => post.is_featured) || posts[0], [posts]);
  const remaining = featured ? posts.filter((post) => post.id !== featured.id) : posts;

  return (
    <>
      {SeoComponent}
      <main className="min-h-screen bg-gray-50 dark:bg-slate-950">
        <section className="border-b border-gray-100 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-wide text-green-700 dark:text-green-300">
                {t("blog_page.label")}
              </p>
              <h1 className="mt-3 text-3xl font-bold text-gray-950 dark:text-white sm:text-4xl">
                {t("blog_page.title")}
              </h1>
              <p className="mt-4 text-base leading-7 text-gray-600 dark:text-slate-400">
                {t("blog_page.subtitle")}
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <label className="relative flex-1">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t("blog_page.search_placeholder")}
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </label>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="">{t("blog_page.all_categories")}</option>
                {categories.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
              {error}
            </div>
          )}

          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-80 animate-pulse rounded-lg bg-white dark:bg-slate-900" />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
              <h2 className="text-lg font-semibold text-gray-950 dark:text-white">{t("blog_page.empty_title")}</h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">{t("blog_page.empty_subtitle")}</p>
            </div>
          ) : (
            <div className="space-y-10">
              {featured && (
                <article className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <Link to={`/blog/${featured.slug}`} className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
                    <div className="aspect-[16/10] bg-gray-100 lg:aspect-auto dark:bg-slate-800">
                      <img
                        src={resolveImageUrl(featured.featured_image)}
                        alt={`${loc(featured.title_en, featured.title_mm)} - Pyonea business guide`}
                        className="h-full w-full object-cover"
                        onError={(event) => { event.currentTarget.src = fallbackImage; }}
                      />
                    </div>
                    <div className="flex flex-col justify-center p-6 sm:p-8">
                      <span className="w-fit rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                        {featured.category || t("blog_page.featured")}
                      </span>
                      <h2 className="mt-4 text-2xl font-bold text-gray-950 dark:text-white sm:text-3xl">
                        {loc(featured.title_en, featured.title_mm)}
                      </h2>
                      <p className="mt-4 line-clamp-4 text-sm leading-7 text-gray-600 dark:text-slate-400">
                        {loc(featured.excerpt_en, featured.excerpt_mm)}
                      </p>
                      <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-green-700 dark:text-green-300">
                        {t("blog_page.read_article")}
                        <ArrowRightIcon className="h-4 w-4" />
                      </span>
                    </div>
                  </Link>
                </article>
              )}

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {remaining.map((post) => (
                  <BlogCard key={post.id} post={post} loc={loc} t={t} />
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </>
  );
};

export default Blog;
