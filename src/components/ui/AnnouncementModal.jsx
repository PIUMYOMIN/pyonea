// src/components/ui/AnnouncementModal.jsx
// Handles three display styles:
//   popup_card   — original modal card with title, content, image, CTA
//   popup_banner — fullscreen-width image-only modal, click anywhere to close
//   page_banner  — handled by PageBanner.jsx (not this component)

import React, { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { getImageUrl } from '../../utils/imageHelpers';

const BADGE_COLORS = {
  green:  'bg-green-500 text-white',
  red:    'bg-red-500 text-white',
  blue:   'bg-blue-500 text-white',
  yellow: 'bg-yellow-400 text-gray-900',
  purple: 'bg-purple-500 text-white',
  orange: 'bg-orange-500 text-white',
};

const ASPECT_CLASSES = {
  '16:9': 'aspect-video',
  '4:3':  'aspect-[4/3]',
  '3:1':  'aspect-[3/1]',
  '1:1':  'aspect-square',
};

// ── Popup Banner (image-only, wide, no text) ──────────────────────────────────
const PopupBanner = ({ announcement, close }) => {
  const ratio = ASPECT_CLASSES[announcement.banner_aspect_ratio ?? '16:9'] ?? 'aspect-video';
  const isExternal = announcement.banner_link_url?.startsWith('http');
  const handleCloseClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    close();
  };

  const imageEl = (
    <div className={`relative w-full ${ratio} overflow-hidden`}>
      <img
        src={getImageUrl(announcement.image)}
        alt={announcement.title}
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Semi-transparent close button — always visible */}
      <button
        type="button"
        onClick={handleCloseClick}
        aria-label="Close"
        className="absolute top-3 right-3 z-20 p-1.5 bg-black/40 hover:bg-black/60
                   backdrop-blur-sm rounded-full text-white transition-colors"
      >
        <XMarkIcon className="h-5 w-5" />
      </button>
      {/* Badge overlay */}
      {announcement.badge_label && (
        <span className={`absolute top-3 left-3 text-xs font-bold
                          px-2.5 py-1 rounded-full shadow
                          ${BADGE_COLORS[announcement.badge_color] ?? BADGE_COLORS.green}`}>
          {announcement.badge_label}
        </span>
      )}
    </div>
  );

  return (
    <motion.div
      className="relative z-10 w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl cursor-pointer"
      initial={{ scale: 0.93, opacity: 0, y: 24 }}
      animate={{ scale: 1,    opacity: 1, y: 0  }}
      exit={{    scale: 0.96, opacity: 0, y: 12 }}
      transition={{ type: 'spring', stiffness: 360, damping: 30 }}
      onClick={close}
    >
      {announcement.banner_link_url ? (
        isExternal ? (
          <a href={announcement.banner_link_url} target="_blank" rel="noopener noreferrer"
             onClick={e => e.stopPropagation()}>
            {imageEl}
          </a>
        ) : (
          <Link to={announcement.banner_link_url} onClick={close}>
            {imageEl}
          </Link>
        )
      ) : imageEl}
    </motion.div>
  );
};

// ── Popup Card (original style with title/content/CTA) ────────────────────────
const PopupCard = ({ announcement, close }) => {
  const badge     = BADGE_COLORS[announcement.badge_color] ?? BADGE_COLORS.green;
  const imgSrc    = announcement.image ? getImageUrl(announcement.image) : null;
  const isExternal = announcement.cta_url?.startsWith('http');
  const CtaComponent = isExternal ? 'a' : Link;
  const ctaProps     = isExternal
    ? { href: announcement.cta_url, target: '_blank', rel: 'noopener noreferrer' }
    : { to: announcement.cta_url };

  return (
    <motion.div
      className="relative z-10 w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden"
      initial={{ scale: 0.92, opacity: 0, y: 20 }}
      animate={{ scale: 1,    opacity: 1, y: 0  }}
      exit={{    scale: 0.95, opacity: 0, y: 10 }}
      transition={{ type: 'spring', stiffness: 340, damping: 28 }}
    >
      {/* Close */}
      <button
        onClick={close}
        className="absolute top-3 right-3 z-20 p-1.5 bg-white/90 dark:bg-slate-700/90
                   backdrop-blur-sm rounded-full shadow-md text-gray-500 dark:text-slate-400
                   hover:text-gray-800 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-700
                   transition-colors"
        aria-label="Close"
      >
        <XMarkIcon className="h-4 w-4" />
      </button>

      {/* Hero image */}
      {imgSrc && (
        <div className="relative w-full h-52 sm:h-64 bg-gray-100 dark:bg-slate-700 overflow-hidden">
          <img src={imgSrc} alt={announcement.title} className="w-full h-full object-cover" />
          {announcement.badge_label && (
            <span className={`absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full shadow ${badge}`}>
              {announcement.badge_label}
            </span>
          )}
        </div>
      )}

      {/* Body */}
      <div className="p-5 sm:p-6">
        {/* Badge (no-image case) */}
        {!imgSrc && announcement.badge_label && (
          <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full mb-3 ${badge}`}>
            {announcement.badge_label}
          </span>
        )}

        <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-slate-100 leading-snug mb-2">
          {announcement.title}
        </h2>

        {announcement.content && (
          <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed mb-4">
            {announcement.content}
          </p>
        )}

        {announcement.cta_label && announcement.cta_url && (
          <CtaComponent
            {...ctaProps}
            onClick={close}
            className={`block w-full text-center py-3 rounded-xl text-sm font-semibold transition-colors
              ${announcement.cta_style === 'outline'
                ? 'border-2 border-green-600 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                : 'bg-green-600 text-white hover:bg-green-700 shadow-sm'
              }`}
          >
            {announcement.cta_label}
          </CtaComponent>
        )}

        <button
          onClick={close}
          className="mt-3 block w-full text-center text-xs text-gray-400 dark:text-slate-500
                     hover:text-gray-600 dark:hover:text-slate-300 transition-colors py-1"
        >
          {announcement.show_once ? "Don't show again today" : 'Dismiss'}
        </button>
      </div>
    </motion.div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const AnnouncementModal = ({ announcement, onClose }) => {
  const overlayRef = useRef(null);

  const close = useCallback(() => {
    if (announcement?.show_once) {
      const key = `ann_seen_${announcement.id}_${new Date().toDateString()}`;
      localStorage.setItem(key, '1');
    }
    onClose();
  }, [announcement, onClose]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [close]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  if (!announcement) return null;

  // page_banner is rendered separately — this modal should not handle it
  if (announcement.display_style === 'page_banner') return null;

  const isBannerOnly = announcement.display_style === 'popup_banner';

  return (
    <AnimatePresence>
      <motion.div
        ref={overlayRef}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => { if (e.target === overlayRef.current) close(); }}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={close}
        />

        {isBannerOnly ? (
          <PopupBanner announcement={announcement} close={close} />
        ) : (
          <PopupCard announcement={announcement} close={close} />
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default AnnouncementModal;
