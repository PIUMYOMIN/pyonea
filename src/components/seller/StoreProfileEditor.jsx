// src/components/seller/StoreProfileEditor.jsx
// Single unified component for all seller profile management.
// Tabs: Basic Info · Images · Policies · Business Hours · Social · Documents · Password

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  BuildingStorefrontIcon,
  PhotoIcon,
  DocumentTextIcon,
  ClockIcon,
  GlobeAltIcon,
  FolderArrowDownIcon,
  KeyIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowUpTrayIcon,
  TrashIcon,
  EyeIcon,
  BellIcon
} from '@heroicons/react/24/outline';
import api from '../../utils/api';
import NrcInput from './NrcInput';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import NotificationPreferences from '../Shared/NotificationPreferences';

// ── Helpers ───────────────────────────────────────────────────────────────────
const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const DAY_LABELS = { monday:'Mon', tuesday:'Tue', wednesday:'Wed', thursday:'Thu', friday:'Fri', saturday:'Sat', sunday:'Sun' };
const DEFAULT_HOURS = Object.fromEntries(DAYS.map(d => [d, { open:'09:00', close:'18:00', closed: d==='sunday' }]));

const Toast = ({ msg, type }) => msg ? (
  <div className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium
    ${type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
    {type === 'success'
      ? <CheckCircleIcon className="h-4 w-4 flex-shrink-0"/>
      : <ExclamationCircleIcon className="h-4 w-4 flex-shrink-0"/>}
    {msg}
  </div>
) : null;

const FieldRow = ({ label, required, hint, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
    {hint && <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{hint}</p>}
  </div>
);

const Input = ({ className='', ...p }) => (
  <input className={`w-full border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:outline-none hover:border-gray-300 dark:hover:border-slate-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 disabled:bg-gray-100 dark:disabled:bg-slate-700 disabled:text-gray-500 dark:disabled:text-slate-400 disabled:cursor-not-allowed transition-all duration-200 ${className}`} {...p}/>
);
const Textarea = ({ className='', ...p }) => (
  <textarea className={`w-full border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:outline-none resize-none hover:border-gray-300 dark:hover:border-slate-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 disabled:bg-gray-100 dark:disabled:bg-slate-700 disabled:text-gray-500 dark:disabled:text-slate-400 disabled:cursor-not-allowed transition-all duration-200 ${className}`} {...p}/>
);
const Select = ({ children, className='', ...p }) => (
  <select className={`w-full border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:outline-none hover:border-gray-300 dark:hover:border-slate-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 disabled:bg-gray-100 dark:disabled:bg-slate-700 disabled:text-gray-500 dark:disabled:text-slate-400 disabled:cursor-not-allowed transition-all duration-200 ${className}`} {...p}>
    {children}
  </select>
);
const SaveBtn = ({ saving, onClick, label='Save Changes' }) => (
  <button onClick={onClick} disabled={saving}
    className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-colors">
    {saving ? 'Saving…' : label}
  </button>
);

// ── ImageUploadBox ────────────────────────────────────────────────────────────
const ImageUploadBox = ({ label, hint, currentUrl, onUpload, onRemove, uploading, aspect='16/9', maxMB=5 }) => {
  const ref = useRef();
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">{label}</p>
      {currentUrl ? (
        <div className="relative group rounded-xl overflow-hidden border border-gray-200 dark:border-slate-600" style={{ aspectRatio: aspect }}>
          <img src={currentUrl} alt={label} className="w-full h-full object-cover"/>
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button onClick={() => ref.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg text-xs font-medium hover:bg-gray-100 dark:hover:bg-slate-700">
              <PhotoIcon className="h-4 w-4"/> Change
            </button>
            <button onClick={onRemove}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700">
              <TrashIcon className="h-4 w-4"/> Remove
            </button>
          </div>
          {uploading && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"/>
            </div>
          )}
        </div>
      ) : (
        <button onClick={() => ref.current?.click()} disabled={uploading}
          className={`w-full border-2 border-dashed border-gray-300 dark:border-slate-600 hover:border-green-400 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-slate-400 hover:text-green-600 transition-colors disabled:opacity-50`}
          style={{ aspectRatio: aspect, minHeight: '120px' }}>
          {uploading
            ? <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-500 border-t-transparent"/>
            : <>
                <ArrowUpTrayIcon className="h-8 w-8"/>
                <span className="text-sm font-medium">Upload {label}</span>
                <span className="text-xs">{hint || `JPG, PNG, WebP · max ${maxMB}MB`}</span>
              </>}
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" className="hidden"
        onChange={e => { if (e.target.files[0]) onUpload(e.target.files[0]); e.target.value=''; }}/>
    </div>
  );
};

// ── PolicyEditor ──────────────────────────────────────────────────────────────
const PolicyEditor = ({ label, name, value, onChange, placeholder }) => {
  const [preview, setPreview] = useState(false);
  const wordCount = value ? value.trim().split(/\s+/).filter(Boolean).length : 0;
  return (
    <div className="border border-gray-100 dark:border-slate-600 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border-b border-gray-100 dark:border-slate-600">
        <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">{label}</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 dark:text-slate-500">{wordCount} words</span>
          <button onClick={() => setPreview(v => !v)}
            className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg transition-colors ${preview ? 'bg-green-100 text-green-700' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'}`}>
            <EyeIcon className="h-3.5 w-3.5"/>{preview ? 'Edit' : 'Preview'}
          </button>
        </div>
      </div>
      {preview ? (
        <div className="px-4 py-3 min-h-[120px] text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
          {value || <span className="text-gray-400 dark:text-slate-500 italic">No content yet.</span>}
        </div>
      ) : (
        <Textarea name={name} value={value} onChange={onChange} placeholder={placeholder}
          rows={6} className="rounded-none border-0 focus:ring-0"/>
      )}
    </div>
  );
};

// ── DocumentRow ───────────────────────────────────────────────────────────────
// Responsive: stacks vertically on mobile, inline on sm+
const DocumentRow = ({ label, fieldName, value, onUpload, uploading, hint, required = false }) => {
  const ref = useRef();
  const [thumbErr, setThumbErr] = useState(false);
  const isUploaded = !!(value && (value.startsWith('http') || value.startsWith('/storage') || value.startsWith('/')));
  const isUploading = uploading === fieldName;
  const isImage = isUploaded && /\.(jpe?g|png|webp)(\?|$)/i.test(value);
  const isPdf   = isUploaded && /\.pdf(\?|$)/i.test(value);

  return (
    <div className="p-4 border-b border-gray-100 dark:border-slate-700 last:border-0">
      <div className="flex gap-4">

        {/* Thumbnail — only for image files that loaded successfully */}
        {isImage && !thumbErr ? (
          <a href={value} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
            <img
              src={value}
              alt={label}
              onError={() => setThumbErr(true)}
              className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700"
            />
          </a>
        ) : isPdf && isUploaded ? (
          <a href={value} target="_blank" rel="noopener noreferrer"
            className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 flex flex-col items-center justify-center rounded-lg border border-gray-200 dark:border-slate-600 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 text-xs font-bold gap-1">
            <DocumentTextIcon className="h-7 w-7"/>
            PDF
          </a>
        ) : (
          <div className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-lg border-2 border-dashed
            ${isUploaded
              ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
              : 'border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800'
            }`}>
            {isUploaded
              ? <CheckCircleIcon className="h-7 w-7 text-green-500 dark:text-green-400"/>
              : <ArrowUpTrayIcon className="h-6 w-6 text-gray-300 dark:text-slate-600"/>
            }
          </div>
        )}

        {/* Right side content */}
        <div className="flex-1 min-w-0">
          {/* Top: label + status badge */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{label}</p>
                {required && (
                  <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800">
                    Required
                  </span>
                )}
              </div>
              {hint && <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{hint}</p>}
            </div>
            {/* Status pill */}
            {isUploaded ? (
              <span className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
                <CheckCircleIcon className="h-3.5 w-3.5"/> Uploaded
              </span>
            ) : (
              <span className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-slate-600">
                <ExclamationCircleIcon className="h-3.5 w-3.5"/> Missing
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap mt-2">
            {isUploaded && (
              <a href={value} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                <EyeIcon className="h-3.5 w-3.5"/> View file
              </a>
            )}
            {isUploading ? (
              <div className="inline-flex items-center gap-2 text-xs text-gray-400 dark:text-slate-500 px-3 py-1.5">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-500 border-t-transparent"/>
                Uploading…
              </div>
            ) : (
              <button onClick={() => ref.current?.click()}
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors
                  ${isUploaded
                    ? 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                    : 'border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30'
                  }`}>
                <ArrowUpTrayIcon className="h-3.5 w-3.5"/>
                {isUploaded ? 'Replace' : 'Upload'}
              </button>
            )}
          </div>
        </div>
      </div>
      <input ref={ref} type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden"
        onChange={e => { if (e.target.files[0]) onUpload(fieldName, e.target.files[0]); e.target.value = ''; }}/>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const TABS = [
  { id:'basic',     label:'Basic Info',      icon: BuildingStorefrontIcon },
  { id:'images',    label:'Images',          icon: PhotoIcon              },
  { id:'policies',  label:'Policies',        icon: DocumentTextIcon       },
  { id:'hours',     label:'Business Hours',  icon: ClockIcon              },
  { id:'social',    label:'Social Links',    icon: GlobeAltIcon           },
  { id:'documents', label:'Documents',       icon: FolderArrowDownIcon    },
  { id:'security',  label:'Password',        icon: KeyIcon                },
  { id:'notifications', label:'Notifications', icon: BellIcon },
];

const StoreProfileEditor = ({ storeData, refreshData }) => {
  const [tab, setTab]         = useState('basic');
  const [data, setData]       = useState(null);
  const { i18n } = useTranslation();
  const loc = (en, mm) => i18n.language === 'my' ? (mm || en) : (en || mm);
  const [businessTypes, setBT] = useState([]);
  const [saving, setSaving]   = useState('');
  const [uploading, setUploading] = useState('');
  const [toast, setToast]     = useState({ msg:'', type:'success' });
  const [docUploading, setDocUploading] = useState('');
  const { user } = useAuth();
  const [notifPrefs, setNotifPrefs] = useState(null);

  const fetchNotifPrefs = async () => {
    if (notifPrefs !== null) return;
    try {
      const res = await api.get('/auth/me');
      setNotifPrefs(res.data?.data?.notification_preferences ?? {});
    } catch { setNotifPrefs({}); }
  };

  const flash = (msg, type='success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg:'', type:'success' }), 3500);
  };

  // ── Load data — runs once when storeData first arrives, never again.
  // This prevents silent background refreshes (triggered by saves/uploads in
  // other tabs) from wiping the user's unsaved edits in the current tab.
  // Image URLs (logo, banner) are read directly from the `storeData` prop in
  // ImageUploadBox, so they always reflect the latest upload without needing
  // to touch `data` state.
  useEffect(() => {
    if (!storeData || data !== null) return;   // <-- skip if already initialised
    setData({
      // Basic
      store_name:     storeData.store_name     || '',
      store_description: storeData.store_description || '',
      business_type:  storeData.business_type  || '',
      business_type_id: storeData.business_type_id || '',
      contact_email:  storeData.contact_email  || '',
      contact_phone:  storeData.contact_phone  || '',
      website:        storeData.website        || '',
      address:        storeData.address        || '',
      city:           storeData.city           || '',
      state:          storeData.state          || '',
      country:        storeData.country        || '',
      postal_code:    storeData.postal_code    || '',
      year_established: storeData.year_established || '',
      employees_count: storeData.employees_count || '',
      account_number: storeData.account_number || '',
      // Policies
      return_policy:   storeData.return_policy   || '',
      shipping_policy: storeData.shipping_policy || '',
      warranty_policy: storeData.warranty_policy || '',
      privacy_policy:  storeData.privacy_policy  || '',
      terms_of_service: storeData.terms_of_service || '',
      // Business Hours
      business_hours_enabled: storeData.business_hours_enabled ?? false,
      business_hours: storeData.business_hours || DEFAULT_HOURS,
      // NRC
      nrc_division:      storeData.nrc_division      || '',
      nrc_township_code: storeData.nrc_township_code || '',
      nrc_township_mm:   storeData.nrc_township_mm   || '',
      nrc_type:          storeData.nrc_type          || '',
      nrc_number:        storeData.nrc_number        || '',
      // Social
      social_facebook:  storeData.social_facebook  || '',
      social_instagram: storeData.social_instagram || '',
      social_twitter:   storeData.social_twitter   || '',
      social_linkedin:  storeData.social_linkedin  || '',
      social_youtube:   storeData.social_youtube   || '',
      // Vacation
      vacation_mode:       storeData.vacation_mode       ?? false,
      vacation_message:    storeData.vacation_message    || '',
      vacation_start_date: storeData.vacation_start_date || '',
      vacation_end_date:   storeData.vacation_end_date   || '',
    });
  }, [storeData, data]);

  useEffect(() => {
    api.get('/business-types').then(r => setBT(r.data?.data || r.data || [])).catch(() => {});
  }, []);

  const set = (k, v) => setData(p => ({ ...p, [k]: v }));
  const setHour = (day, field, val) =>
    setData(p => ({ ...p, business_hours: { ...p.business_hours, [day]: { ...p.business_hours?.[day], [field]: val } } }));

  // ── Save basic info ───────────────────────────────────────────────────────
  const saveBasic = async () => {
    setSaving('basic');
    try {
      await api.put('/seller/my-store/update', {
        store_name:        data.store_name,
        store_description: data.store_description,
        business_type:     data.business_type,
        business_type_id:  data.business_type_id || undefined,
        contact_email:     data.contact_email,
        contact_phone:     data.contact_phone,
        website:           data.website    || null,
        address:           data.address,
        city:              data.city,
        state:             data.state,
        country:           data.country,
        postal_code:       data.postal_code       || null,
        year_established:  data.year_established  || null,
        employees_count:   data.employees_count   || null,
        account_number:    data.account_number    || null,
      });
      flash('Store information saved.');
      if (refreshData) await refreshData();
    } catch (e) { flash(e.response?.data?.message || 'Failed to save.', 'error'); }
    finally { setSaving(''); }
  };

  // ── Save NRC / identity number ────────────────────────────────────────────
  // Kept separate from saveBasic to avoid sending Myanmar Unicode characters
  // alongside the full store payload — the backend serialises $seller->fresh()
  // which can blow up with a UTF-8 500 when json-cast columns contain
  // previously-malformed bytes.  Sending only the 4 NRC fields (no
  // nrc_township_mm — it is derived display-only data) keeps the payload safe.
  const saveNrc = async () => {
    setSaving('nrc');
    try {
      await api.put('/seller/my-store/update', {
        nrc_division:      data.nrc_division      || null,
        nrc_township_code: data.nrc_township_code || null,
        // nrc_township_mm intentionally omitted — it is Myanmar Unicode, derived
        // from nrc_township_code.  The backend stores & re-derives it safely.
        nrc_type:          data.nrc_type          || null,
        nrc_number:        data.nrc_number        || null,
      });
      flash('NRC number saved.');
      if (refreshData) await refreshData();
    } catch (e) { flash(e.response?.data?.message || 'Failed to save NRC.', 'error'); }
    finally { setSaving(''); }
  };

  // ── Logo upload ───────────────────────────────────────────────────────────
  const uploadLogo = async (file) => {
    setUploading('logo');
    try {
      const fd = new FormData(); fd.append('logo', file);
      await api.post('/seller/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      flash('Logo updated.');
      if (refreshData) await refreshData();
    } catch (e) { flash('Logo upload failed.', 'error'); }
    finally { setUploading(''); }
  };

  const removeLogo = async () => {
    if (!confirm('Remove the store logo?')) return;
    setUploading('logo');
    try {
      await api.delete('/seller/logo');
      flash('Logo removed.');
      if (refreshData) await refreshData();
    } catch (e) { flash('Failed to remove logo.', 'error'); }
    finally { setUploading(''); }
  };

  // ── Banner upload ─────────────────────────────────────────────────────────
  const uploadBanner = async (file) => {
    setUploading('banner');
    try {
      const fd = new FormData(); fd.append('banner', file);
      await api.post('/seller/banner', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      flash('Banner updated.');
      if (refreshData) await refreshData();
    } catch (e) { flash('Banner upload failed.', 'error'); }
    finally { setUploading(''); }
  };

  const removeBanner = async () => {
    if (!confirm('Remove the store banner?')) return;
    setUploading('banner');
    try {
      await api.delete('/seller/banner');
      flash('Banner removed.');
      if (refreshData) await refreshData();
    } catch (e) { flash('Failed to remove banner.', 'error'); }
    finally { setUploading(''); }
  };

  // ── Save policies ─────────────────────────────────────────────────────────
  const savePolicies = async () => {
    setSaving('policies');
    try {
      await api.put('/seller/policies', {
        return_policy:   data.return_policy   || null,
        shipping_policy: data.shipping_policy || null,
        warranty_policy: data.warranty_policy || null,
        privacy_policy:  data.privacy_policy  || null,
        terms_of_service: data.terms_of_service || null,
      });
      flash('Policies saved.');
      if (refreshData) await refreshData();
    } catch (e) { flash('Failed to save policies.', 'error'); }
    finally { setSaving(''); }
  };

  // ── Save business hours ───────────────────────────────────────────────────
  const saveHours = async () => {
    setSaving('hours');
    try {
      await api.put('/seller/business-hours', {
        business_hours_enabled: data.business_hours_enabled,
        business_hours: data.business_hours,
        vacation_mode: data.vacation_mode,
        vacation_message: data.vacation_message || null,
        vacation_start_date: data.vacation_start_date || null,
        vacation_end_date: data.vacation_end_date || null,
      });
      flash('Hours saved.');
      if (refreshData) await refreshData();
    } catch (e) { flash('Failed to save hours.', 'error'); }
    finally { setSaving(''); }
  };

  // ── Save social ───────────────────────────────────────────────────────────
  const saveSocial = async () => {
    setSaving('social');
    try {
      await api.put('/seller/my-store/update', {
        social_facebook: data.social_facebook || null,
        social_instagram: data.social_instagram || null,
        social_twitter: data.social_twitter || null,
        social_linkedin: data.social_linkedin || null,
        social_youtube: data.social_youtube || null,
      });
      flash('Social links saved.');
      if (refreshData) await refreshData();
    } catch (e) { flash('Failed to save social links.', 'error'); }
    finally { setSaving(''); }
  };

  // ── Upload document ───────────────────────────────────────────────────────
  const uploadDocument = async (fieldName, file) => {
    setDocUploading(fieldName);
    try {
      const fd = new FormData();
      fd.append('document', file);
      fd.append('document_type', fieldName);
      await api.post('/seller/onboarding/documents', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      flash('Document uploaded.');
      if (refreshData) await refreshData();
    } catch (e) { flash(e.response?.data?.message || 'Upload failed.', 'error'); }
    finally { setDocUploading(''); }
  };

  // ── Change password ───────────────────────────────────────────────────────
  const [pwd, setPwd] = useState({ current:'', next:'', confirm:'' });
  const [pwdSaving, setPwdSaving] = useState(false);
  const savePassword = async () => {
    if (!pwd.current || !pwd.next) { flash('Fill in all password fields.', 'error'); return; }
    if (pwd.next !== pwd.confirm)  { flash('Passwords do not match.', 'error'); return; }
    if (pwd.next.length < 8)       { flash('Password must be at least 8 characters.', 'error'); return; }
    setPwdSaving(true);
    try {
      await api.put('/users/profile/password', {
        current_password: pwd.current,
        new_password: pwd.next,
        new_password_confirmation: pwd.confirm,
      });
      flash('Password changed successfully.');
      setPwd({ current:'', next:'', confirm:'' });
    } catch (e) { flash(e.response?.data?.message || 'Failed to change password.', 'error'); }
    finally { setPwdSaving(false); }
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (!data) return (
    <div className="flex justify-center items-center h-48">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500"/>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-0">
      <Toast msg={toast.msg} type={toast.type}/>

      {/* ── Tab Bar ─────────────────────────────────────────────────────── */}
      <div className="flex overflow-x-auto gap-1 pb-1 mb-6 border-b border-gray-100 dark:border-slate-700 scrollbar-hide">
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); if (t.id === 'notifications') fetchNotifPrefs(); }}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-xl whitespace-nowrap flex-shrink-0 transition-colors
              ${tab === t.id ? 'bg-green-600 text-white' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}>
            <t.icon className="h-4 w-4 flex-shrink-0"/>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── BASIC INFO ──────────────────────────────────────────────────── */}
      {tab === 'basic' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <FieldRow label="Store Name" required>
              <Input value={data.store_name} onChange={e => set('store_name', e.target.value)} placeholder="Your store name"/>
            </FieldRow>
            <FieldRow label="Business Type">
              <Select key={`bt-${businessTypes.length}`} value={data.business_type} onChange={e => { set('business_type', e.target.value); const bt = businessTypes.find(b => b.slug_en === e.target.value); if (bt) set('business_type_id', bt.id); }}>
                <option value="">Select type…</option>
                {businessTypes.map(bt => <option key={bt.slug_en} value={bt.slug_en}>{loc(bt.name_en, bt.name_mm)}</option>)}
              </Select>
            </FieldRow>
            <FieldRow label="Contact Email" required>
              <Input type="email" value={data.contact_email} onChange={e => set('contact_email', e.target.value)}/>
            </FieldRow>
            <FieldRow label="Contact Phone" required>
              <Input type="tel" value={data.contact_phone} onChange={e => set('contact_phone', e.target.value)} placeholder="+959..."/>
            </FieldRow>
            <FieldRow label="Website">
              <Input type="url" value={data.website} onChange={e => set('website', e.target.value)} placeholder="https://yourstore.com"/>
            </FieldRow>
            <FieldRow label="Bank Account Number" hint="For payouts">
              <Input value={data.account_number} onChange={e => set('account_number', e.target.value)}/>
            </FieldRow>
          </div>

          <FieldRow label="Store Description" hint="Shown on your public profile. Describe what you sell and your unique value.">
            <Textarea rows={4} value={data.store_description} onChange={e => set('store_description', e.target.value)} placeholder="Tell customers about your store…"/>
          </FieldRow>

          <div className="border-t border-gray-100 dark:border-slate-700 pt-5">
            <p className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-4">Store Address</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FieldRow label="Street Address">
                <Input value={data.address} onChange={e => set('address', e.target.value)} placeholder="Street / Building"/>
              </FieldRow>
              <FieldRow label="City">
                <Input value={data.city} onChange={e => set('city', e.target.value)}/>
              </FieldRow>
              <FieldRow label="State / Region">
                <Input value={data.state} onChange={e => set('state', e.target.value)}/>
              </FieldRow>
              <FieldRow label="Country">
                <Input value={data.country} onChange={e => set('country', e.target.value)} placeholder="Myanmar"/>
              </FieldRow>
              <FieldRow label="Postal Code">
                <Input value={data.postal_code} onChange={e => set('postal_code', e.target.value)}/>
              </FieldRow>
              <FieldRow label="Year Established">
                <Input type="number" min="1900" max={new Date().getFullYear()} value={data.year_established} onChange={e => set('year_established', e.target.value)}/>
              </FieldRow>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <SaveBtn saving={saving === 'basic'} onClick={saveBasic}/>
          </div>
        </div>
      )}

      {/* ── IMAGES ──────────────────────────────────────────────────────── */}
      {tab === 'images' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <ImageUploadBox
              label="Store Logo"
              hint="Square · JPG, PNG, WebP · max 2MB · Shown in search results and your store header"
              currentUrl={storeData?.store_logo}
              onUpload={uploadLogo}
              onRemove={removeLogo}
              uploading={uploading === 'logo'}
              aspect="1/1"
              maxMB={2}
            />
            <ImageUploadBox
              label="Store Banner"
              hint="16:9 landscape · JPG, PNG, WebP · max 5MB · Displayed at the top of your store page"
              currentUrl={storeData?.store_banner}
              onUpload={uploadBanner}
              onRemove={removeBanner}
              uploading={uploading === 'banner'}
              aspect="16/9"
              maxMB={5}
            />
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-xs text-amber-800 dark:text-amber-400">
            <strong>Tips:</strong> Use a square logo (min 200×200px) with a transparent or white background.
            Banner images look best at 1200×675px. Both images are shown on your public store page.
          </div>
        </div>
      )}

      {/* ── POLICIES ────────────────────────────────────────────────────── */}
      {tab === 'policies' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-slate-500 mb-2">
            Policies are shown on your public store page. Be clear and specific — buyers read these before purchasing.
          </p>
          {[
            { name:'return_policy',   label:'Return & Refund Policy', placeholder:'e.g. Items can be returned within 7 days of delivery for a full refund. Products must be unused and in original packaging…' },
            { name:'shipping_policy', label:'Shipping Policy',        placeholder:'e.g. We ship Monday–Friday. Orders placed before 12 PM are dispatched same day. Delivery takes 2–5 business days…' },
            { name:'warranty_policy', label:'Warranty Policy',        placeholder:'e.g. All electronics carry a 6-month manufacturer warranty. Contact us within 30 days of purchase for warranty claims…' },
            { name:'privacy_policy',  label:'Privacy Policy',         placeholder:'e.g. We collect your name, email and delivery address solely to process orders. We do not share your information with third parties…' },
            { name:'terms_of_service',label:'Terms of Service',       placeholder:'e.g. By placing an order you agree to our terms. Prices are in MMK and include applicable taxes…' },
          ].map(p => (
            <PolicyEditor key={p.name} label={p.label} name={p.name}
              value={data[p.name]} placeholder={p.placeholder}
              onChange={e => set(p.name, e.target.value)}/>
          ))}
          <div className="flex justify-end pt-2">
            <SaveBtn saving={saving === 'policies'} onClick={savePolicies}/>
          </div>
        </div>
      )}

      {/* ── BUSINESS HOURS ──────────────────────────────────────────────── */}
      {tab === 'hours' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">Show Business Hours</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Display your operating hours on your public store page</p>
            </div>
            <button onClick={() => set('business_hours_enabled', !data.business_hours_enabled)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${data.business_hours_enabled ? 'bg-green-500' : 'bg-gray-200'}`}>
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${data.business_hours_enabled ? 'translate-x-5' : 'translate-x-0'}`}/>
            </button>
          </div>

          {data.business_hours_enabled && (
            <div className="border border-gray-100 dark:border-slate-600 rounded-xl overflow-hidden">
              {DAYS.map((day, i) => {
                const h = data.business_hours?.[day] || { open:'09:00', close:'18:00', closed: false };
                return (
                  <div key={day} className={`flex items-center gap-4 px-5 py-3 ${i % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-gray-50/50 dark:bg-slate-800/50'}`}>
                    <span className="w-12 text-sm font-medium text-gray-700 dark:text-slate-300">{DAY_LABELS[day]}</span>
                    <button onClick={() => setHour(day, 'closed', !h.closed)}
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${!h.closed ? 'bg-green-500' : 'bg-gray-200'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${!h.closed ? 'translate-x-4' : 'translate-x-0'}`}/>
                    </button>
                    {!h.closed ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input type="time" value={h.open} onChange={e => setHour(day, 'open', e.target.value)}
                          className="border border-gray-200 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm focus:ring-1 focus:ring-green-500 focus:outline-none bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"/>
                        <span className="text-gray-400 dark:text-slate-500 text-sm">–</span>
                        <input type="time" value={h.close} onChange={e => setHour(day, 'close', e.target.value)}
                          className="border border-gray-200 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm focus:ring-1 focus:ring-green-500 focus:outline-none bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"/>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400 dark:text-slate-500 italic flex-1">Closed</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Vacation mode */}
          <div className="border-t border-gray-100 dark:border-slate-700 pt-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">Vacation Mode</p>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Pause your store while you're away. Customers will see your vacation message.</p>
              </div>
              <button onClick={() => set('vacation_mode', !data.vacation_mode)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${data.vacation_mode ? 'bg-amber-500' : 'bg-gray-200'}`}>
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${data.vacation_mode ? 'translate-x-5' : 'translate-x-0'}`}/>
              </button>
            </div>
            {data.vacation_mode && (
              <div className="space-y-3">
                <FieldRow label="Vacation Message">
                  <Textarea rows={2} value={data.vacation_message} onChange={e => set('vacation_message', e.target.value)}
                    placeholder="e.g. We are away until Jan 20. Orders placed now will ship on Jan 21."/>
                </FieldRow>
                <div className="grid grid-cols-2 gap-3">
                  <FieldRow label="From">
                    <Input type="date" value={data.vacation_start_date} onChange={e => set('vacation_start_date', e.target.value)}/>
                  </FieldRow>
                  <FieldRow label="Until">
                    <Input type="date" value={data.vacation_end_date} onChange={e => set('vacation_end_date', e.target.value)}/>
                  </FieldRow>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <SaveBtn saving={saving === 'hours'} onClick={saveHours}/>
          </div>
        </div>
      )}

      {/* ── SOCIAL LINKS ────────────────────────────────────────────────── */}
      {tab === 'social' && (
        <div className="space-y-5">
          <p className="text-sm text-gray-500 dark:text-slate-500">Social links appear on your public store page and help customers find and follow you.</p>
          {[
            { name:'social_facebook',  label:'Facebook',  placeholder:'https://facebook.com/yourpage' },
            { name:'social_instagram', label:'Instagram', placeholder:'https://instagram.com/yourhandle' },
            { name:'social_twitter',   label:'X / Twitter', placeholder:'https://x.com/yourhandle' },
            { name:'social_linkedin',  label:'LinkedIn',  placeholder:'https://linkedin.com/in/yourprofile' },
            { name:'social_youtube',   label:'YouTube',   placeholder:'https://youtube.com/@yourchannel' },
          ].map(s => (
            <FieldRow key={s.name} label={s.label}>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400 dark:text-slate-500 w-24 flex-shrink-0">{s.placeholder.split('/')[2]}</span>
                <Input type="url" value={data[s.name]} onChange={e => set(s.name, e.target.value)} placeholder={s.placeholder}/>
              </div>
            </FieldRow>
          ))}
          <div className="flex justify-end pt-2">
            <SaveBtn saving={saving === 'social'} onClick={saveSocial}/>
          </div>
        </div>
      )}

      {/* ── DOCUMENTS ───────────────────────────────────────────────────── */}
      {tab === 'documents' && (() => {
        // Mirror backend's getAllowedDocumentTypes() using the loaded businessTypes list
        const currentBT = businessTypes.find(
          bt => bt.slug_en === data?.business_type || bt.id === data?.business_type_id
        );
        const noBusinessType = !data?.business_type && !data?.business_type_id;

        // Build the document slot list — each item drives one DocumentRow
        const docSlots = [
          currentBT?.requires_registration && {
            fieldName: 'business_registration_document',
            label: 'Business Registration Certificate',
            hint: 'Official company registration document · PDF, JPG, PNG · max 5MB',
            required: true,
            value: storeData?.business_registration_document,
          },
          currentBT?.requires_tax_document && {
            fieldName: 'tax_registration_document',
            label: 'Tax Registration Document',
            hint: 'TIN or tax registration certificate · PDF, JPG, PNG · max 5MB',
            required: true,
            value: storeData?.tax_registration_document,
          },
          currentBT?.requires_business_certificate && {
            fieldName: 'business_certificate',
            label: 'Business Certificate',
            hint: 'Business operating certificate · PDF, JPG, PNG · max 5MB',
            required: true,
            value: storeData?.business_certificate,
          },
          {
            fieldName: 'identity_document_front',
            label: 'Identity Document — Front',
            hint: 'NRC / Passport front side · JPG, PNG · max 2MB',
            required: true,
            value: storeData?.identity_document_front,
          },
          {
            fieldName: 'identity_document_back',
            label: 'Identity Document — Back',
            hint: 'NRC / Passport back side · JPG, PNG · max 2MB',
            required: false,
            value: storeData?.identity_document_back,
          },
        ].filter(Boolean);

        const uploadedCount  = docSlots.filter(d => d.value).length;
        const requiredSlots  = docSlots.filter(d => d.required);
        const requiredDone   = requiredSlots.filter(d => d.value).length;
        const allRequiredDone = requiredDone === requiredSlots.length;
        const docStatus       = storeData?.document_status;
        const docSubmitted    = storeData?.documents_submitted;

        return (
          <div className="space-y-4">

            {/* ── Status overview card ─────────────────────────────────── */}
            <div className="rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">Document Status</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                    {uploadedCount} of {docSlots.length} uploaded · {requiredDone} of {requiredSlots.length} required
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Submission status pill */}
                  {docSubmitted ? (
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border
                      ${docStatus === 'approved'
                        ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
                        : docStatus === 'rejected'
                        ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
                        : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                      }`}>
                      <CheckCircleIcon className="h-3.5 w-3.5"/>
                      {docStatus === 'approved' ? 'Verified'
                        : docStatus === 'rejected' ? 'Rejected'
                        : 'Under Review'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-600">
                      <ExclamationCircleIcon className="h-3.5 w-3.5"/> Not Submitted
                    </span>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="px-4 py-2 bg-white dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${allRequiredDone ? 'bg-green-500' : 'bg-amber-400'}`}
                      style={{ width: `${docSlots.length ? (uploadedCount / docSlots.length) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 dark:text-slate-400 flex-shrink-0">
                    {Math.round(docSlots.length ? (uploadedCount / docSlots.length) * 100 : 0)}%
                  </span>
                </div>
              </div>

              {/* Rejection reason */}
              {docStatus === 'rejected' && storeData?.document_rejection_reason && (
                <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border-t border-red-100 dark:border-red-800 text-xs text-red-700 dark:text-red-400">
                  <strong>Rejection reason:</strong> {storeData.document_rejection_reason}
                </div>
              )}
            </div>

            {/* ── Warning: business type not set ────────────────────────── */}
            {noBusinessType && (
              <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-800 dark:text-amber-400">
                <ExclamationCircleIcon className="h-4 w-4 flex-shrink-0 mt-0.5"/>
                <span>
                  Set your <strong>Business Type</strong> in the Basic Info tab first — the required
                  documents depend on your business type.
                </span>
              </div>
            )}

            {/* ── Document rows ─────────────────────────────────────────── */}
            <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
              {docSlots.map(slot => (
                <DocumentRow
                  key={slot.fieldName}
                  label={slot.label}
                  fieldName={slot.fieldName}
                  value={slot.value}
                  onUpload={uploadDocument}
                  uploading={docUploading}
                  hint={slot.hint}
                  required={slot.required}
                />
              ))}
            </div>

            {/* ── NRC Identity Number ───────────────────────────────────── */}
            <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">NRC / Identity Number</p>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                  Myanmar National Registration Card number. Click Save below after editing.
                </p>
              </div>
              <div className="p-4">
                <NrcInput
                  value={{
                    nrc_division:      data?.nrc_division      || '',
                    nrc_township_code: data?.nrc_township_code || '',
                    nrc_township_mm:   data?.nrc_township_mm   || '',
                    nrc_type:          data?.nrc_type          || '',
                    nrc_number:        data?.nrc_number        || '',
                  }}
                  onChange={(nrc) => setData(prev => ({ ...prev, ...nrc }))}
                />
              </div>
              {/* Save NRC — always visible inside its own card */}
              <div className="px-4 py-3 bg-gray-50 dark:bg-slate-800/60 border-t border-gray-200 dark:border-slate-700 flex justify-end">
                <SaveBtn saving={saving === 'nrc'} onClick={saveNrc} label="Save NRC Number" />
              </div>
            </div>

          </div>
        );
      })()}

      {/* ── NOTIFICATIONS ─────────────────────────────────────────── */}
      {tab === 'notifications' && (
        <div className="max-w-lg space-y-5">
          <p className="text-sm text-gray-500 dark:text-slate-500">
            Choose which emails Pyonea sends you. Saved to your account and synced across devices.
          </p>
          {notifPrefs === null ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-green-500" />
            </div>
          ) : (
            <NotificationPreferences
              userType="seller"
              initialPrefs={notifPrefs}
              onSaved={(saved) => setNotifPrefs(saved)}
            />
          )}
        </div>
      )}

      {/* ── PASSWORD ────────────────────────────────────────────────────── */}
      {tab === 'security' && (
        <div className="max-w-md space-y-5">
          <p className="text-sm text-gray-500 dark:text-slate-500">Update your account password. Use at least 8 characters with a mix of letters and numbers.</p>
          {[
            { key:'current', label:'Current Password' },
            { key:'next',    label:'New Password',     hint:'Minimum 8 characters' },
            { key:'confirm', label:'Confirm New Password' },
          ].map(f => (
            <FieldRow key={f.key} label={f.label} hint={f.hint}>
              <Input type="password" value={pwd[f.key]} onChange={e => setPwd(p => ({ ...p, [f.key]: e.target.value }))} placeholder="••••••••"/>
            </FieldRow>
          ))}
          <SaveBtn saving={pwdSaving} onClick={savePassword} label="Change Password"/>
        </div>
      )}
    </div>
  );
};

export default StoreProfileEditor;