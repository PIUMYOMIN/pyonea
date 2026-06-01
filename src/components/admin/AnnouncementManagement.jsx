// src/components/admin/AnnouncementManagement.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  MegaphoneIcon, PlusIcon, PencilIcon, TrashIcon,
  CheckCircleIcon, XCircleIcon, ArrowPathIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';
import api from '../../utils/api';
import { getImageUrl } from '../../utils/imageHelpers';

const TYPES     = ['announcement', 'promotion', 'newsletter', 'advertisement', 'sponsorship'];
const AUDIENCES = ['all', 'guests', 'buyers', 'sellers'];
const COLORS    = ['green', 'red', 'blue', 'yellow', 'purple', 'orange'];

const BADGE_PREVIEW = {
  green: 'bg-green-500 text-white', red: 'bg-red-500 text-white',
  blue: 'bg-blue-500 text-white', yellow: 'bg-yellow-400 text-gray-900',
  purple: 'bg-purple-500 text-white', orange: 'bg-orange-500 text-white',
};

// Converts a UTC ISO string (from API) → "YYYY-MM-DDTHH:mm" in local time
// so datetime-local inputs display the correct local time.
const toLocalInput = (iso) => {
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Converts a "YYYY-MM-DDTHH:mm" local string back to UTC ISO for the server.
const toUtcIso = (localStr) => (localStr ? new Date(localStr).toISOString() : '');

const EMPTY = {
  title: '', content: '', type: 'announcement',
  display_style: 'popup_card',
  banner_link_url: '', banner_aspect_ratio: '16:9',
  image: null,
  cta_label: '', cta_url: '', cta_style: 'primary',
  badge_label: '', badge_color: 'green',
  target_audience: 'all', is_active: true, show_once: true,
  delay_seconds: 1, starts_at: '', ends_at: '', sort_order: 0,
};

const AnnouncementManagement = () => {
  const [items, setItems]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');
  const [showForm, setShowForm]     = useState(false);
  const [editing, setEditing]       = useState(null);
  const [form, setForm]             = useState(EMPTY);
  const [imageFile, setImageFile]   = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [removeImage, setRemoveImage]   = useState(false);
  const [fieldErrors, setFieldErrors]   = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);

  const handleDelete = (id) => setDeleteTarget(id);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/admin/announcements/${deleteTarget}`);
      flash('Deleted.');
      setDeleteTarget(null);
      fetch();
    } catch { flash('Failed to delete.', 'error'); setDeleteTarget(null); }
  };

  const flash = (msg, type = 'success') => {
    if (type === 'success') setSuccess(msg);
    else setError(msg);
    setTimeout(() => { setSuccess(''); setError(''); }, 4000);
  };

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/announcements');
      setItems(res.data.data ?? []);
    } catch { setError('Failed to load announcements.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY });
    setImageFile(null);
    setImagePreview('');
    setRemoveImage(false);
    setFieldErrors({});
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      title: item.title ?? '',
      content: item.content ?? '',
      type: item.type ?? 'announcement',
      image: null,
      cta_label: item.cta_label ?? '',
      cta_url: item.cta_url ?? '',
      cta_style: item.cta_style ?? 'primary',
      badge_label: item.badge_label ?? '',
      badge_color: item.badge_color ?? 'green',
      target_audience: item.target_audience ?? 'all',
      is_active: item.is_active ?? true,
      show_once: item.show_once ?? true,
      delay_seconds: item.delay_seconds ?? 1,
      starts_at: item.starts_at ? toLocalInput(item.starts_at) : '',
      ends_at:   item.ends_at   ? toLocalInput(item.ends_at)   : '',
      display_style: item.display_style ?? 'popup_card',
      banner_link_url: item.banner_link_url ?? '',
      banner_aspect_ratio: item.banner_aspect_ratio ?? '16:9',
      sort_order: item.sort_order ?? 0,
    });
    setImagePreview(item.image ?? '');
    setImageFile(null);
    setRemoveImage(false);
    setFieldErrors({});
    setShowForm(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setRemoveImage(false);
  };

  // Simple change handler – no memoization needed
  const handleChange = (field) => (e) => {
    let val = e.target.type === 'checkbox' ? e.target.checked
            : e.target.type === 'number'   ? Number(e.target.value)
            : e.target.value;
    setForm(prev => ({ ...prev, [field]: val }));
    // Clear field error when user types
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setFieldErrors({});
    try {
      const fd = new FormData();
      // Convert datetime-local values (local time) → UTC ISO strings for the server
      const formToSend = {
        ...form,
        starts_at: toUtcIso(form.starts_at),
        ends_at:   toUtcIso(form.ends_at),
      };
      Object.entries(formToSend).forEach(([k, v]) => {
        if (v === null || v === undefined) return;
        if (typeof v === 'boolean') {
          fd.append(k, v ? '1' : '0');
        } else if (v !== '') {
          fd.append(k, v);
        }
      });
      if (imageFile) fd.append('image', imageFile);
      if (removeImage) fd.append('remove_image', '1');

      let res;
      if (editing) {
        // PHP can't parse FormData on PUT → use POST with _method spoofing
        fd.append('_method', 'PUT');
        res = await api.post(`/admin/announcements/${editing.id}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        res = await api.post('/admin/announcements', fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      if (res.data.success) {
        flash(editing ? 'Announcement updated.' : 'Announcement created.');
        setShowForm(false);
        fetch();
      }
    } catch (err) {
      if (err.response?.data?.errors) {
        setFieldErrors(err.response.data.errors);
        setError('Please correct the highlighted fields.');
      } else {
        setError(err.response?.data?.message ?? 'Failed to save.');
      }
    } finally { setSaving(false); }
  };



  const handleToggle = async (id) => {
    try {
      await api.patch(`/admin/announcements/${id}/toggle`);
      fetch();
    } catch { flash('Failed to toggle.', 'error'); }
  };

  const isEffectivelyActive = (item) => {
    if (!item.is_active) return false;
    const now = new Date();
    if (item.starts_at && new Date(item.starts_at) > now) return false;
    if (item.ends_at && new Date(item.ends_at) < now) return false;
    return true;
  };

  // Simple input component – inline to avoid any HOC issues
  const renderInput = (label, name, type = 'text', required = false, placeholder = '') => (
    <div key={name}>
      <label htmlFor={name} className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">
        {label} {required && '*'}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={form[name] ?? ''}
        onChange={handleChange(name)}
        placeholder={placeholder}
        className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-green-500 focus:border-transparent
          ${fieldErrors[name] ? 'border-red-500 dark:border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-slate-600'}`}
      />
      {fieldErrors[name] && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors[name][0]}</p>}
    </div>
  );

  return (
    <div className="space-y-5">

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="font-bold text-gray-900 dark:text-slate-100 mb-2">Delete Announcement</h3>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-5">This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-xl text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700">
                Cancel
              </button>
              <button onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <MegaphoneIcon className="h-5 w-5 text-green-600" />
            Announcements & Banners
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Manage popup banners shown on the homepage
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetch} className="p-2 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg">
            <ArrowPathIcon className="h-4 w-4" />
          </button>
          <button onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700">
            <PlusIcon className="h-4 w-4" /> New
          </button>
        </div>
      </div>

      {/* Alerts */}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
          <CheckCircleIcon className="h-4 w-4 flex-shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <XCircleIcon className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-8 px-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700">
              <h3 className="font-semibold text-gray-900 dark:text-slate-100">
                {editing ? 'Edit Announcement' : 'New Announcement'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 rounded-lg">
                <XCircleIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Title */}
                <div className="sm:col-span-2">
                  {renderInput('Title', 'title', 'text', true)}
                </div>

                {/* Content */}
                <div className="sm:col-span-2">
                  <label htmlFor="content" className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Content</label>
                  <textarea
                    id="content"
                    name="content"
                    rows={3}
                    value={form.content ?? ''}
                    onChange={handleChange('content')}
                    className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-green-500
                      ${fieldErrors.content ? 'border-red-500 dark:border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-slate-600'}`}
                  />
                  {fieldErrors.content && <p className="mt-1 text-xs text-red-600">{fieldErrors.content[0]}</p>}
                </div>

                {/* Type */}
                <div>
                  <label htmlFor="type" className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Type</label>
                  <select
                    id="type"
                    name="type"
                    value={form.type}
                    onChange={handleChange('type')}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500"
                  >
                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                {/* Display Style */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">
                    Display Style
                  </label>
                  <select
                    value={form.display_style ?? "popup_card"}
                    onChange={handleChange("display_style")}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-green-500"
                  >
                    <option value="popup_card">🪟 Popup Card — title, content, CTA</option>
                    <option value="popup_banner">🖼 Popup Banner — image only (full-width modal)</option>
                    <option value="page_banner">📌 Page Banner — image strip below header</option>
                  </select>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {(form.display_style ?? "popup_card") === "popup_card" && "Modal with title, text, image and CTA button."}
                    {form.display_style === "popup_banner" && "Large image-only popup. Title saved but not shown to buyers."}
                    {form.display_style === "page_banner" && "Non-blocking strip shown sitewide below the header."}
                  </p>
                </div>

                {/* Banner fields */}
                {(form.display_style === "popup_banner" || form.display_style === "page_banner") && (
                  <div className="col-span-full grid grid-cols-1 sm:grid-cols-2 gap-3 p-3
                                  bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Click-through URL</label>
                      <input value={form.banner_link_url ?? ""} onChange={handleChange("banner_link_url")}
                        placeholder="https://… or /products"
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-green-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Aspect Ratio</label>
                      <select value={form.banner_aspect_ratio ?? "16:9"} onChange={handleChange("banner_aspect_ratio")}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-green-500">
                        <option value="16:9">16:9 — Standard widescreen</option>
                        <option value="4:3">4:3 — Classic</option>
                        <option value="3:1">3:1 — Panoramic / strip</option>
                        <option value="1:1">1:1 — Square</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Audience */}
                <div>
                  <label htmlFor="target_audience" className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Target Audience</label>
                  <select
                    id="target_audience"
                    name="target_audience"
                    value={form.target_audience}
                    onChange={handleChange('target_audience')}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500"
                  >
                    {AUDIENCES.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>

                {/* CTA */}
                {renderInput('CTA Button Text', 'cta_label', 'text', false, 'e.g. Shop Now')}
                {renderInput('CTA URL', 'cta_url', 'text', false, '/products or https://...')}

                {/* CTA Style */}
                <div>
                  <label htmlFor="cta_style" className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">CTA Style</label>
                  <select
                    id="cta_style"
                    name="cta_style"
                    value={form.cta_style}
                    onChange={handleChange('cta_style')}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500"
                  >
                    <option value="primary">Primary (filled)</option>
                    <option value="outline">Outline</option>
                  </select>
                </div>

                {/* Badge */}
                {renderInput('Badge Label', 'badge_label', 'text', false, 'e.g. 🔥 New')}

                {/* Badge Color */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Badge Color</label>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {COLORS.map(c => (
                      <button
                        type="button"
                        key={c}
                        onClick={() => setForm(p => ({ ...p, badge_color: c }))}
                        className={`w-6 h-6 rounded-full border-2 transition-transform
                          ${BADGE_PREVIEW[c]} ${form.badge_color === c ? 'scale-125 border-gray-800' : 'border-transparent'}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Dates */}
                {renderInput('Starts At', 'starts_at', 'datetime-local')}
                {renderInput('Ends At', 'ends_at', 'datetime-local')}

                {/* Options */}
                {renderInput('Delay (seconds)', 'delay_seconds', 'number', false, '')}
                {renderInput('Sort Order', 'sort_order', 'number', false, '')}

                {/* Checkboxes */}
                <div className="sm:col-span-2 flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={form.is_active} onChange={handleChange('is_active')} />
                    <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={form.show_once} onChange={handleChange('show_once')} />
                    <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Show once per day</span>
                  </label>
                </div>

                {/* Image Upload */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-2">Banner Image</label>
                  <div className="flex items-start gap-4">
                    {imagePreview ? (
                      <div className="relative w-40 h-24 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0">
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => { setImagePreview(''); setImageFile(null); setRemoveImage(true); }}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5"
                        >
                          <XCircleIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-40 h-24 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400">
                        <PhotoIcon className="h-6 w-6" />
                        <span className="text-[10px] mt-1">No image</span>
                      </div>
                    )}
                    <div>
                      <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700">
                        <PhotoIcon className="h-4 w-4" />
                        {imagePreview ? 'Change image' : 'Upload image'}
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                      </label>
                      <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Max 4MB · JPG, PNG, WebP</p>
                    </div>
                  </div>
                  {fieldErrors.image && <p className="mt-1 text-xs text-red-600">{fieldErrors.image[0]}</p>}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-5 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50">
                  {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-green-500" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-14 text-gray-400 dark:text-slate-500">
            <MegaphoneIcon className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No announcements yet.</p>
            <button onClick={openCreate} className="mt-3 text-sm text-green-700 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 underline">
              Create your first one
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm divide-y divide-gray-100">
              <thead className="bg-gray-50 dark:bg-slate-900">
                <tr>
                  {['Title', 'Type', 'Style', 'Audience', 'Dates', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {items.map(item => {
                  const effectiveActive = isEffectivelyActive(item);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {item.image ? (
                            <img src={getImageUrl(item.image)} alt="" className="w-10 h-7 object-cover rounded-md" />
                          ) : (
                            <div className="w-10 h-7 bg-gray-100 rounded-md flex items-center justify-center">
                              <PhotoIcon className="h-4 w-4 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900 dark:text-slate-100 line-clamp-1">{item.title}</p>
                            {item.badge_label && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${BADGE_PREVIEW[item.badge_color] ?? BADGE_PREVIEW.green}`}>
                                {item.badge_label}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 capitalize text-gray-600 dark:text-slate-400">{item.type}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap
                          ${item.display_style === 'page_banner'   ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' :
                            item.display_style === 'popup_banner'  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                                                                     'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300'}`}>
                          {item.display_style === 'page_banner'  ? '📌 Page' :
                           item.display_style === 'popup_banner' ? '🖼 Banner' :
                                                                    '🪟 Card'}
                        </span>
                      </td>
                      <td className="px-4 py-3 capitalize text-gray-600 dark:text-slate-400">{item.target_audience}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-slate-500 text-xs">
                        {item.starts_at ? new Date(item.starts_at).toLocaleDateString() : '—'} →{' '}
                        {item.ends_at ? new Date(item.ends_at).toLocaleDateString() : '∞'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {/* Status badge — read-only display */}
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            effectiveActive
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                              : item.is_active
                                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                                : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400'
                          }`}>
                            {effectiveActive
                              ? <><CheckCircleIcon className="h-3 w-3" /> Active</>
                              : item.is_active
                                ? <><XCircleIcon className="h-3 w-3" /> Sched.</>
                                : <><XCircleIcon className="h-3 w-3" /> Off</>}
                          </span>
                          {/* Toggle button — clearly separate */}
                          <button
                            onClick={() => handleToggle(item.id)}
                            title={item.is_active ? 'Deactivate' : 'Activate'}
                            className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                              item.is_active ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'
                            }`}
                          >
                            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
                              item.is_active ? 'translate-x-4' : 'translate-x-0'
                            }`} />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(item)} className="p-1.5 text-gray-400 hover:text-green-700 hover:bg-green-50 rounded-lg">
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnnouncementManagement;
