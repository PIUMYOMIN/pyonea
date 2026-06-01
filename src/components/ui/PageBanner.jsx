// src/components/ui/PageBanner.jsx
// Renders page_banner-type announcements as a dismissible top-of-page image strip.
// Placed below <Header /> in the layout. Image fills full width, no text overlay.
// Respects wide viewports — no max-width cap, true full-bleed.

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { getImageUrl } from '../../utils/imageHelpers';

const ASPECT_CLASSES = {
  '16:9': 'aspect-video',
  '4:3':  'aspect-[4/3]',
  '3:1':  'aspect-[3/1]',
  '1:1':  'aspect-square',
};

const PageBanner = () => {
  const [banners, setBanners]   = useState([]);   // all active page_banner announcements
  const [current, setCurrent]   = useState(0);    // index of currently visible banner
  const [dismissed, setDismissed] = useState([]); // IDs dismissed this session

  useEffect(() => {
    api.get('/announcements')
      .then(res => {
        const pageBanners = (res.data.data ?? []).filter(a => a.display_style === 'page_banner');
        // Filter out show_once banners already seen today
        const eligible = pageBanners.filter(a => {
          if (!a.show_once) return true;
          const key = `ann_seen_${a.id}_${new Date().toDateString()}`;
          return !localStorage.getItem(key);
        });
        setBanners(eligible);
      })
      .catch(() => {});
  }, []);

  const dismiss = useCallback((id) => {
    const ann = banners.find(b => b.id === id);
    if (ann?.show_once) {
      const key = `ann_seen_${id}_${new Date().toDateString()}`;
      localStorage.setItem(key, '1');
    }
    setDismissed(d => [...d, id]);
    // Advance to next banner if available
    setCurrent(c => c + 1);
  }, [banners]);

  const visibleBanners = banners.filter(b => !dismissed.includes(b.id));
  if (visibleBanners.length === 0) return null;

  const banner = visibleBanners[0];
  if (!banner?.image) return null;

  const ratio      = ASPECT_CLASSES[banner.banner_aspect_ratio ?? '3:1'] ?? 'aspect-[3/1]';
  const isExternal = banner.banner_link_url?.startsWith('http');

  const imageEl = (
    <div className={`relative w-full ${ratio} bg-gray-200 dark:bg-slate-700 overflow-hidden`}>
      <img
        src={getImageUrl(banner.image)}
        alt={banner.title}
        className="absolute inset-0 w-full h-full object-cover object-center"
        loading="eager"
      />

      {/* Badge */}
      {banner.badge_label && (
        <span className={`absolute top-2 left-3 sm:top-3 sm:left-4
                          text-[10px] sm:text-xs font-bold px-2 py-0.5 sm:px-2.5 sm:py-1
                          rounded-full shadow z-10
                          ${{
                            green: 'bg-green-500 text-white',
                            red: 'bg-red-500 text-white',
                            blue: 'bg-blue-500 text-white',
                            yellow: 'bg-yellow-400 text-gray-900',
                            purple: 'bg-purple-500 text-white',
                            orange: 'bg-orange-500 text-white',
                          }[banner.badge_color] ?? 'bg-green-500 text-white'}`}>
          {banner.badge_label}
        </span>
      )}

      {/* Dismiss button */}
      <button
        onClick={e => { e.stopPropagation(); dismiss(banner.id); }}
        aria-label="Dismiss banner"
        className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10
                   p-1 sm:p-1.5 bg-black/40 hover:bg-black/60
                   backdrop-blur-sm rounded-full text-white transition-colors"
      >
        <XMarkIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </button>
    </div>
  );

  return (
    <AnimatePresence>
      <motion.div
        key={banner.id}
        className="w-full overflow-hidden"
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.35, ease: 'easeInOut' }}
      >
        {banner.banner_link_url ? (
          isExternal ? (
            <a href={banner.banner_link_url} target="_blank" rel="noopener noreferrer"
               className="block cursor-pointer">
              {imageEl}
            </a>
          ) : (
            <Link to={banner.banner_link_url} className="block cursor-pointer">
              {imageEl}
            </Link>
          )
        ) : (
          <div>{imageEl}</div>
        )}

        {/* Multiple banners indicator */}
        {visibleBanners.length > 1 && (
          <div className="flex justify-center gap-1.5 py-1.5 bg-gray-50 dark:bg-slate-900">
            {visibleBanners.map((b, i) => (
              <button
                key={b.id}
                onClick={() => setBanners(prev => {
                  // Re-order so clicked banner is first
                  const rest = prev.filter(x => !dismissed.includes(x.id));
                  const idx  = rest.findIndex(x => x.id === b.id);
                  if (idx <= 0) return prev;
                  const reordered = [...rest];
                  [reordered[0], reordered[idx]] = [reordered[idx], reordered[0]];
                  return reordered;
                })}
                className={`h-1.5 rounded-full transition-all ${
                  i === 0 ? 'w-4 bg-green-600' : 'w-1.5 bg-gray-300 dark:bg-slate-600'
                }`}
                aria-label={`Show banner ${i + 1}`}
              />
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default PageBanner;
