import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowPathIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import api from "../../utils/api";

const blankForm = {
  title_en: "",
  title_mm: "",
  slug: "",
  excerpt_en: "",
  excerpt_mm: "",
  content_en: "",
  content_mm: "",
  featured_image: "",
  category: "Business Guides",
  tags: "",
  status: "draft",
  is_featured: false,
  published_at: "",
  seo_title_en: "",
  seo_title_mm: "",
  seo_description_en: "",
  seo_description_mm: "",
};

const inputCls = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white";
const labelCls = "mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400";

const formatForInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
};

const BlogManagement = () => {
  const [posts, setPosts] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [message, setMessage] = useState(null);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/blog", {
        params: {
          page,
          per_page: 15,
          status,
          ...(search.trim() ? { search: search.trim() } : {}),
        },
      });
      const payload = res.data?.data;
      setPosts(payload?.data || []);
      setMeta({
        current_page: payload?.current_page || 1,
        last_page: payload?.last_page || 1,
        total: payload?.total || 0,
      });
    } catch {
      setMessage({ type: "error", text: "Blog posts could not be loaded." });
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const startCreate = () => {
    setEditing(null);
    setForm(blankForm);
    setMessage(null);
  };

  const startEdit = (post) => {
    setEditing(post);
    setForm({
      ...blankForm,
      ...post,
      tags: (post.tags || []).join(", "),
      published_at: formatForInput(post.published_at),
    });
    setMessage(null);
  };

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const payload = useMemo(() => ({
    ...form,
    tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
    is_featured: !!form.is_featured,
    published_at: form.published_at || null,
  }), [form]);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      if (editing) {
        await api.put(`/admin/blog/${editing.id}`, payload);
      } else {
        await api.post("/admin/blog", payload);
      }
      setMessage({ type: "success", text: editing ? "Blog post updated." : "Blog post created." });
      startCreate();
      loadPosts();
    } catch (error) {
      const text = error.response?.data?.message || "Could not save blog post.";
      setMessage({ type: "error", text });
    } finally {
      setSaving(false);
    }
  };

  const quickAction = async (post, action) => {
    try {
      if (action === "delete") {
        if (!window.confirm(`Delete "${post.title_en}"?`)) return;
        await api.delete(`/admin/blog/${post.id}`);
      } else {
        await api.post(`/admin/blog/${post.id}/${action}`);
      }
      loadPosts();
    } catch {
      setMessage({ type: "error", text: "Action failed. Please try again." });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-950 dark:text-white">Blog Management</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">Create SEO guides for buyers, sellers, and Myanmar wholesale search traffic.</p>
        </div>
        <button onClick={startCreate} className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700">
          <PlusIcon className="h-4 w-4" />
          New Post
        </button>
      </div>

      {message && (
        <div className={`rounded-lg border p-3 text-sm ${message.type === "success" ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300" : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"}`}>
          {message.text}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <section className="rounded-lg border border-gray-100 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 border-b border-gray-100 p-4 dark:border-slate-800 sm:flex-row">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") { setPage(1); loadPosts(); } }}
              placeholder="Search title or slug..."
              className={inputCls}
            />
            <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className={`${inputCls} sm:max-w-44`}>
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
            <button onClick={loadPosts} className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
              <ArrowPathIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-slate-800">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Published</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-500">Loading blog posts...</td></tr>
                ) : posts.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-500">No blog posts found.</td></tr>
                ) : posts.map((post) => (
                  <tr key={post.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/60">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-950 dark:text-white">{post.title_en}</p>
                      <p className="text-xs text-gray-500">/{post.slug}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${post.status === "published" ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300" : post.status === "archived" ? "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300" : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"}`}>
                        {post.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{post.category || "-"}</td>
                    <td className="px-4 py-3 text-gray-500">{post.published_at ? new Date(post.published_at).toLocaleDateString("en-GB") : "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => startEdit(post)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-green-700 dark:hover:bg-slate-800">
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        {post.status !== "published" && (
                          <button onClick={() => quickAction(post, "publish")} className="rounded-lg px-2 py-1 text-xs font-semibold text-green-700 hover:bg-green-50 dark:text-green-300 dark:hover:bg-green-900/20">Publish</button>
                        )}
                        {post.status !== "archived" && (
                          <button onClick={() => quickAction(post, "archive")} className="rounded-lg px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800">Archive</button>
                        )}
                        <button onClick={() => quickAction(post, "delete")} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta.last_page > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 p-4 text-sm dark:border-slate-800">
              <span className="text-gray-500">Page {meta.current_page} of {meta.last_page} · {meta.total} posts</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-lg border border-gray-200 px-3 py-1 disabled:opacity-50 dark:border-slate-700">Prev</button>
                <button disabled={page >= meta.last_page} onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))} className="rounded-lg border border-gray-200 px-3 py-1 disabled:opacity-50 dark:border-slate-700">Next</button>
              </div>
            </div>
          )}
        </section>

        <form onSubmit={save} className="rounded-lg border border-gray-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-gray-950 dark:text-white">{editing ? "Edit Blog Post" : "Create Blog Post"}</h3>
            {editing && (
              <button type="button" onClick={startCreate} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800">
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className={labelCls}>English title</label>
              <input required value={form.title_en} onChange={(event) => set("title_en", event.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Myanmar title</label>
              <input value={form.title_mm || ""} onChange={(event) => set("title_mm", event.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Slug</label>
              <input value={form.slug || ""} onChange={(event) => set("slug", event.target.value)} placeholder="auto-generated if empty" className={inputCls} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Category</label>
                <input value={form.category || ""} onChange={(event) => set("category", event.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Status</label>
                <select value={form.status} onChange={(event) => set("status", event.target.value)} className={inputCls}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>Featured image URL</label>
              <input value={form.featured_image || ""} onChange={(event) => set("featured_image", event.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Tags</label>
              <input value={form.tags || ""} onChange={(event) => set("tags", event.target.value)} placeholder="wholesale, supplier, myanmar" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>English excerpt</label>
              <textarea value={form.excerpt_en || ""} onChange={(event) => set("excerpt_en", event.target.value)} rows={2} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Myanmar excerpt</label>
              <textarea value={form.excerpt_mm || ""} onChange={(event) => set("excerpt_mm", event.target.value)} rows={2} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>English content</label>
              <textarea required value={form.content_en} onChange={(event) => set("content_en", event.target.value)} rows={8} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Myanmar content</label>
              <textarea value={form.content_mm || ""} onChange={(event) => set("content_mm", event.target.value)} rows={8} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>SEO description EN</label>
              <textarea value={form.seo_description_en || ""} onChange={(event) => set("seo_description_en", event.target.value)} rows={2} className={inputCls} />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
              <input type="checkbox" checked={!!form.is_featured} onChange={(event) => set("is_featured", event.target.checked)} className="rounded border-gray-300 text-green-600 focus:ring-green-500" />
              Feature on blog page
            </label>
            <button disabled={saving} className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60">
              {saving ? "Saving..." : editing ? "Update Post" : "Create Post"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BlogManagement;
