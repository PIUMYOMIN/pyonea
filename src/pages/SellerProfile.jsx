// src/pages/SellerProfile.jsx
// Public seller profile page — fully structured with SEO, tabs, live data.
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Tab } from '@headlessui/react';
import {
  StarIcon, MapPinIcon, PhoneIcon, EnvelopeIcon, GlobeAltIcon,
  ShoppingBagIcon, UserGroupIcon, ChatBubbleLeftIcon,
  CheckBadgeIcon, CheckIcon, ShareIcon, ClockIcon, BuildingStorefrontIcon,
  ArrowUpIcon, ArrowLeftIcon, TruckIcon,
} from '@heroicons/react/24/outline';
import { LinkIcon } from '@heroicons/react/24/solid';
import {
  StarIcon as StarSolid,
  CheckBadgeIcon as CheckBadgeSolid,
} from '@heroicons/react/24/solid';
import useSEO from '../hooks/useSEO';
import api from '../utils/api';
import { SITE_PUBLIC_URL } from '../config';
import { getImageUrl } from '../utils/imageHelpers';
import { useAuth } from '../context/AuthContext';
import ProductCard from '../components/ui/ProductCard';
import { SkeletonProductCard, SkeletonSellerProfile } from '../components/ui/Skeleton';
import { DEFAULT_PLACEHOLDER } from '../config';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtK = (n) => {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (v >= 1_000) return (v / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  return v.toLocaleString();
};

const DAY_LABELS = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
  thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday',
};

const SOCIAL_META = {
  social_facebook: { label: 'Facebook', color: '#1877F2', icon: 'f' },
  social_instagram: { label: 'Instagram', color: '#E1306C', icon: '📷' },
  social_twitter: { label: 'X', color: '#000', icon: '𝕏' },
  social_linkedin: { label: 'LinkedIn', color: '#0A66C2', icon: 'in' },
  social_youtube: { label: 'YouTube', color: '#FF0000', icon: '▶' },
};

const Stars = ({ rating = 0, size = 'h-4 w-4', count }) => {
  const r = parseFloat(rating) || 0;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <StarSolid key={i} className={`${size} ${i <= Math.round(r) ? 'text-yellow-400' : 'text-gray-200'}`} />
      ))}
      {count != null && <span className="text-xs text-gray-500 dark:text-slate-500 ml-1">({count})</span>}
    </div>
  );
};

const TodayHours = ({ hours, enabled }) => {
  if (!enabled || !hours) return null;
  const day = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()];
  const today = hours[day];
  if (!today) return null;
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <ClockIcon className="h-3.5 w-3.5 text-gray-400 dark:text-slate-600 flex-shrink-0" />
      {today.closed
        ? <span className="text-red-600 font-medium">Closed today</span>
        : <span className="text-green-600 font-medium">Open: {today.open} – {today.close}</span>}
    </div>
  );
};

// ── Delivery Zones Panel ─────────────────────────────────────────────────────
/**
 * Groups flat delivery area records into a Region → City → Township tree and
 * renders them as collapsible accordion rows. Each row shows shipping fee,
 * free-shipping threshold, estimated delivery days, and service badges.
 */

const fmtFee = (fee) =>
  fee === 0 || fee === '0.00' || fee == null ? 'Free' : `${Number(fee).toLocaleString()} Ks`;

// ── Delivery Zones Panel — multi-column card grid ────────────────────────────
const DeliveryZonesPanel = ({ areas, loading, error }) => {
  if (loading || areas === null) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 pb-6">
        {[1,2,3,4,5,6,7,8].map(i => (
          <div key={i} className="h-24 rounded-lg bg-gray-100 dark:bg-slate-800 animate-pulse" style={{ opacity: 1 - i * 0.1 }} />
        ))}
      </div>
    );
  }
  if (error) return <p className="py-8 text-center text-sm text-red-500">{error}</p>;
  if (!areas.length) return (
    <div className="py-10 text-center">
      <TruckIcon className="h-7 w-7 mx-auto mb-2 text-gray-300 dark:text-slate-600" />
      <p className="text-xs text-gray-400 dark:text-slate-500">No delivery zones published yet.</p>
    </div>
  );

  // Group: nationwide → then by state → cities/townships inside each
  const regionMap = {};
  areas.filter(a => a.area_type === 'country').forEach(a => {
    regionMap['__nationwide__'] = regionMap['__nationwide__'] || [];
    regionMap['__nationwide__'].push(a);
  });
  areas.filter(a => a.area_type !== 'country').forEach(a => {
    const k = a.state || 'Other';
    regionMap[k] = regionMap[k] || [];
    regionMap[k].push(a);
  });

  return (
    <div className="pb-6">
      {/* Column grid — each region is one card */}
      <div className="columns-2 sm:columns-3 lg:columns-4 gap-2 space-y-0">
        {Object.entries(regionMap).map(([regionKey, regionAreas]) => {
          const isNationwide = regionKey === '__nationwide__';
          const regionRow    = regionAreas.find(a => ['state','country'].includes(a.area_type));
          const subAreas     = regionAreas.filter(a => !['state','country'].includes(a.area_type));

          // Group sub-areas by city
          const cityMap = {};
          subAreas.forEach(a => {
            const c = a.city || '—';
            cityMap[c] = cityMap[c] || [];
            cityMap[c].push(a);
          });

          return (
            <div
              key={regionKey}
              className="break-inside-avoid mb-2 rounded-lg border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden"
            >
              {/* Region header */}
              <div className="flex items-center justify-between px-2.5 py-1.5 bg-gray-50 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700">
                <span className="text-xs font-semibold text-gray-700 dark:text-slate-200 truncate">
                  {isNationwide ? '🌐 Nationwide' : regionKey}
                </span>
                {regionRow && (
                  <span className={`text-xs font-medium flex-shrink-0 ml-1 ${Number(regionRow.shipping_fee) === 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-slate-400'}`}>
                    {fmtFee(regionRow.shipping_fee)}
                  </span>
                )}
              </div>

              {/* Cities + townships */}
              <div className="px-2.5 py-1.5 space-y-1">
                {Object.keys(cityMap).length === 0 && regionRow && (
                  <p className="text-xs text-gray-400 dark:text-slate-500 italic">All areas</p>
                )}
                {Object.entries(cityMap).map(([cityName, cityAreas]) => {
                  const cityRow   = cityAreas.find(a => a.area_type === 'city');
                  const townships = cityAreas.filter(a => a.area_type !== 'city');
                  const fee       = cityRow ? fmtFee(cityRow.shipping_fee) : null;

                  return (
                    <div key={cityName}>
                      {/* City row */}
                      <div className="flex items-baseline justify-between gap-1">
                        <span className="text-xs font-medium text-gray-700 dark:text-slate-300 truncate">{cityName}</span>
                        {fee && (
                          <span className={`text-xs flex-shrink-0 tabular-nums ${fee === 'Free' ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-slate-500'}`}>
                            {fee}
                          </span>
                        )}
                      </div>
                      {/* Townships as comma-separated micro-text */}
                      {townships.length > 0 && (
                        <p className="text-gray-400 dark:text-slate-500 leading-snug" style={{ fontSize: '10px' }}>
                          {townships.map((t, i) => (
                            <span key={t.id}>
                              {t.township || t.specific_location}
                              {Number(t.shipping_fee) === 0 && <span className="text-green-500"> ✓</span>}
                              {i < townships.length - 1 && <span className="text-gray-300 dark:text-slate-700">, </span>}
                            </span>
                          ))}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer legend */}
      <p className="text-xs text-gray-400 dark:text-slate-500 mt-3">
        <span className="text-green-500 font-medium">✓</span> = free shipping for that township.
        Fees may vary by order size.
      </p>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const getDescriptionPreview = (description, sentenceLimit = 4) => {
  const text = description?.trim();
  if (!text) return { preview: '', hasMore: false };

  const sentences = text.match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g) || [text];
  const preview = sentences.slice(0, sentenceLimit).join(' ').trim();

  return {
    preview,
    hasMore: sentences.length > sentenceLimit,
  };
};

const SellerProfile = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [seller, setSeller] = useState(null);
  const [products, setProducts] = useState([]);
  const [productPage, setProductPage] = useState(1);
  const [productsHasMore, setProductsHasMore] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [stats, setStats] = useState({});
  const [reviews, setReviews] = useState({ data: [], meta: {} });
  const [loading, setLoading] = useState(true);
  const [revLoading, setRevLoading] = useState(false);
  const [revPage, setRevPage] = useState(1);
  const [error, setError] = useState(null);
  const [following, setFollowing] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [isOwnStore, setIsOwnStore] = useState(false);
  const [fwLoading, setFwLoading] = useState(false);
  const [followError, setFollowError] = useState('');
  const [reviewForm, setReviewForm] = useState({ open: false, rating: 0, comment: '', submitting: false });
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const productSentinelRef = useRef(null);
  const productsFetchingRef = useRef(false);
  // Delivery zone tab
  const [deliveryAreas, setDeliveryAreas] = useState(null); // null = not yet fetched
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [deliveryError, setDeliveryError] = useState(null);

  // ── Fetch ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    setDescriptionExpanded(false);
    setProducts([]);
    setProductPage(1);
    setProductsHasMore(false);
    (async () => {
      try {
        const r = await api.get(`/sellers/${slug}`, { params: { page: 1, per_page: 24 } });
        if (!r.data.success) throw new Error();
        const d = r.data.data;
        const productPayload = d.products || {};
        const productItems = Array.isArray(productPayload.data) ? productPayload.data : [];
        const currentPage = productPayload.current_page ?? 1;
        const lastPage = productPayload.last_page ?? currentPage;
        setSeller(d.seller);
        setProducts(productItems);
        setProductPage(currentPage);
        setProductsHasMore(currentPage < lastPage);
        setStats(d.stats || {});
        setFollowing(d.is_following || false);
        setFollowers(d.stats?.followers_count || 0);
        setIsOwnStore(d.is_own_store || false);
      } catch { setError('Could not load this seller profile.'); }
      finally { setLoading(false); }
    })();
  }, [slug]);

  const loadMoreProducts = useCallback(async () => {
    if (!slug || !productsHasMore || productsFetchingRef.current) return;

    productsFetchingRef.current = true;
    setProductsLoading(true);
    const nextPage = productPage + 1;

    try {
      const r = await api.get(`/sellers/${slug}`, { params: { page: nextPage, per_page: 24 } });
      if (!r.data.success) throw new Error();

      const productPayload = r.data.data?.products || {};
      const productItems = Array.isArray(productPayload.data) ? productPayload.data : [];
      const currentPage = productPayload.current_page ?? nextPage;
      const lastPage = productPayload.last_page ?? currentPage;

      setProducts(prev => {
        const ids = new Set(prev.map(p => p.id));
        return [...prev, ...productItems.filter(p => !ids.has(p.id))];
      });
      setProductPage(currentPage);
      setProductsHasMore(currentPage < lastPage);
    } catch (err) {
      console.error('Could not load more seller products:', err);
      setProductsHasMore(false);
    } finally {
      productsFetchingRef.current = false;
      setProductsLoading(false);
    }
  }, [productPage, productsHasMore, slug]);

  useEffect(() => {
    if (activeTab !== 0 || !productSentinelRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMoreProducts();
      },
      { rootMargin: '300px' }
    );

    observer.observe(productSentinelRef.current);
    return () => observer.disconnect();
  }, [activeTab, loadMoreProducts]);

  const loadReviews = useCallback(async (page = 1) => {
    if (!slug) return;
    setRevLoading(true);
    try {
      const r = await api.get(`/reviews/sellers/${slug}`, { params: { page, per_page: 5 } });
      if (r.data.success) setReviews(r.data.data || { data: [], meta: {} });
    } catch {
      setReviews({ data: [], meta: {} });
    }
    finally { setRevLoading(false); }
  }, [slug]);

  useEffect(() => { loadReviews(revPage); }, [slug, revPage]);

  // ── Follow ─────────────────────────────────────────────────────────────
  const toggleFollow = async () => {
    if (!user) {
      navigate('/login', { state: { from: window.location.pathname } });
      return;
    }
    if (!seller?.store_slug) {
      console.error('Follow: no store_slug');
      return;
    }
    setFwLoading(true);
    const previousFollowing = following;
    const previousFollowers = followers;
    const optimisticFollowing = !following;
    setFollowing(optimisticFollowing);
    setFollowers(count => Math.max(0, count + (optimisticFollowing ? 1 : -1)));
    try {
      const res = await api.post(`/follow/seller/${seller.store_slug}/toggle`);
      if (res.data.success) {
        const nowFollowing = res.data.data?.is_following ?? !following;
        setFollowing(nowFollowing);
        setFollowers(res.data.data?.followers_count ?? (nowFollowing ? followers + 1 : followers - 1));
      }
    } catch (err) {
      setFollowing(previousFollowing);
      setFollowers(previousFollowers);
      const msg = err.response?.data?.message || 'Failed to update follow status';
      setFollowError(msg);
      setTimeout(() => setFollowError(''), 3500);
    } finally {
      setFwLoading(false);
    }
  };

  // ── Submit review ──────────────────────────────────────────────────────
  const submitReview = async () => {
    if (!reviewForm.rating) return;
    setReviewForm(f => ({ ...f, submitting: true }));
    try {
      await api.post(`/sellers/${seller.store_slug}/reviews`, {
        rating: reviewForm.rating,
        comment: reviewForm.comment,
      });
      setReviewForm({ open: false, rating: 0, comment: '', submitting: false });
      setRevPage(1);
      loadReviews(1);
    } catch { setReviewForm(f => ({ ...f, submitting: false })); }
  };

  const sellerShareImage = seller?.store_logo
    ? getImageUrl(seller.store_logo)
    : seller?.store_banner
      ? getImageUrl(seller.store_banner)
      : undefined;

  // ── Share ──────────────────────────────────────────────────────────────
  const shareData = useCallback(() => {
    const lang = i18n.language?.startsWith("my") ? "my" : "en";
    const profileUrl = `${window.location.origin}/sellers/${slug}?lang=${lang}`;
    const title = seller?.store_name || "Seller on Pyonea";
    const text = t("seller.share_text", { name: title });
    const enc = encodeURIComponent;
    const website = seller?.website
      ? (seller.website.startsWith("http") ? seller.website : `https://${seller.website}`)
      : null;
    return {
      profileUrl,
      website,
      title,
      text,
      description: `Seller profile on Pyonea • ${profileUrl}`,
      image: sellerShareImage,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${enc(profileUrl)}`,
      whatsapp: `https://wa.me/?text=${enc(`${text} ${profileUrl}`)}`,
      viber: `viber://forward?text=${enc(`${text} ${profileUrl}`)}`,
      telegram: `https://t.me/share/url?url=${enc(profileUrl)}&text=${enc(text)}`,
      twitter: `https://x.com/intent/tweet?text=${enc(text)}&url=${enc(profileUrl)}`,
    };
  }, [i18n.language, seller?.store_name, seller?.website, sellerShareImage, slug, t]);

  const handleShare = async () => {
    const d = shareData();
    if (navigator.share) {
      try {
        await navigator.share({ title: d.title, text: d.text, url: d.profileUrl });
        return;
      } catch { /* ignore */ }
    }
    setShareOpen((prev) => !prev);
  };

  const copyText = async (value) => {
    if (!value) return;
    await navigator.clipboard.writeText(value).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Close share panel when clicking outside
  useEffect(() => {
    if (!shareOpen) return;
    const handler = (e) => {
      if (!e.target.closest('[data-share-panel]')) setShareOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [shareOpen]);

  // Delivery tab index is stable regardless of seller state:
  // Products(0) Reviews(1) About(2) Policies(3 if exists) DeliveryZones(last)
  // We compute it from seller safely here — seller may be null before load.
  const hasPoliciesForIndex = !!(seller?.return_policy || seller?.shipping_policy || seller?.warranty_policy || seller?.privacy_policy || seller?.terms_of_service);
  const deliveryTabIndex = 3 + (hasPoliciesForIndex ? 1 : 0);

  // Lazy-load delivery areas the first time the Delivery Zones tab is activated.
  // Must live here — before any early returns — to satisfy the Rules of Hooks.
  useEffect(() => {
    if (!slug) return;
    if (activeTab !== deliveryTabIndex) return;
    if (deliveryAreas !== null || deliveryLoading) return;
    setDeliveryLoading(true);
    api.get(`/sellers/${slug}/delivery-areas`)
      .then(r => setDeliveryAreas(r.data?.data ?? []))
      .catch(() => setDeliveryError('Could not load delivery zones.'))
      .finally(() => setDeliveryLoading(false));
  }, [activeTab, deliveryTabIndex, slug, deliveryAreas, deliveryLoading]);

  // ── SEO ────────────────────────────────────────────────────────────────
  const sellerSchema = seller ? {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: seller.store_name,
    description: seller.store_description,
    image: sellerShareImage,
    url: `${SITE_PUBLIC_URL}/sellers/${slug}`,
    // telephone: seller.contact_phone || undefined,
    email: seller.contact_email || undefined,
    address: seller.address ? {
      '@type': 'PostalAddress',
      streetAddress: seller.address,
      addressLocality: seller.city,
      addressRegion: seller.state,
      addressCountry: seller.country || 'MM',
    } : undefined,
    aggregateRating: (reviews?.meta?.total || 0) > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: seller.reviews_avg_rating,
      reviewCount: seller.reviews_count,
    } : undefined,
  } : null;

  const pageSchema = seller ? {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: `${SITE_PUBLIC_URL}/`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Sellers',
            item: `${SITE_PUBLIC_URL}/sellers`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: seller.store_name,
            item: `${SITE_PUBLIC_URL}/sellers/${slug}`,
          },
        ],
      },
      sellerSchema,
    ].filter(Boolean),
  } : null;

  const SeoComponent = useSEO({
    title: seller ? seller.store_name : 'Seller Profile',
    description: seller?.store_description?.slice(0, 155) || 'View products and information from this verified seller on Pyonea.',
    image: sellerShareImage,
    imageAlt: seller?.store_name || undefined,
    url: `/sellers/${slug}`,
    type: 'profile',
    schema: pageSchema,
  });

  // ── States ─────────────────────────────────────────────────────────────
  // ── Guard: loading first, then error, then not-found ─────────────────────
  if (loading) return <SkeletonSellerProfile />;

  if (error) return (
    <>
      {SeoComponent}
      <div className="min-h-screen theme-transition bg-gray-50 dark:bg-slate-900 flex flex-col items-center justify-center gap-4 text-center px-4">
        <BuildingStorefrontIcon className="h-14 w-14 text-gray-300" />
        <h1 className="text-lg font-semibold text-gray-700 dark:text-slate-300">{error}</h1>
        <button onClick={() => navigate('/sellers')} className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1">
          <ArrowLeftIcon className="h-4 w-4" /> Browse all sellers
        </button>
      </div>
    </>
  );

  if (!seller) return (
    <>
      {SeoComponent}
      <div className="min-h-screen theme-transition bg-gray-50 dark:bg-slate-900 flex flex-col items-center justify-center gap-4 text-center px-4">
        <BuildingStorefrontIcon className="h-14 w-14 text-gray-300" />
        <h1 className="text-lg font-semibold text-gray-700 dark:text-slate-300">Seller not found</h1>
        <Link to="/sellers" className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1">
          <ArrowLeftIcon className="h-4 w-4" /> Browse all sellers
        </Link>
      </div>
    </>
  );

  const rating = parseFloat(seller.reviews_avg_rating) || 0;
  const reviewCount = seller.reviews_count || 0;
  const memberSince = new Date(seller.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  const isVerified = seller.is_verified || seller.verification_status === 'verified';
  const descriptionPreview = getDescriptionPreview(seller.store_description);
  const socialLinks = Object.entries(SOCIAL_META)
    .filter(([k]) => seller[k])
    .map(([k, meta]) => ({ key: k, url: seller[k], ...meta }));
  const hasPolicies = seller?.return_policy || seller?.shipping_policy || seller?.warranty_policy || seller?.privacy_policy || seller?.terms_of_service;

  const tabs = [
    { label: `Products (${stats.active_products ?? stats.total_products ?? products.length})` },
    { label: `Reviews (${reviewCount})` },
    { label: 'About' },
    ...(hasPolicies ? [{ label: 'Policies' }] : []),
    { label: 'Delivery Zones' },
  ];

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <>
      {SeoComponent}

      {/* ── Vacation banner ─────────────────────────────────────────────── */}
      {seller.vacation_mode && (
        <div className="bg-amber-500 text-white text-center text-sm py-2.5 px-4 font-medium">
          🌴 {seller.vacation_message || 'This store is currently on vacation. Orders may be delayed.'}
        </div>
      )}

      <div className="bg-gray-50 dark:bg-slate-900 min-h-screen">

        {/* ── Banner ──────────────────────────────────────────────────── */}
        <div className="relative h-44 sm:h-60 bg-gradient-to-r from-green-700 to-green-500 overflow-hidden">
          {seller.store_banner && (
            <img loading="lazy" src={getImageUrl(seller.store_banner)} alt="Store banner"
              className="w-full h-full object-cover" onError={e => e.target.style.display = 'none'} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>

        {/* ── Store header ────────────────────────────────────────────── */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="relative -mt-14 sm:-mt-16 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">

              {/* Logo + name */}
              <div className="flex items-end gap-4">
                <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl border-4 border-white shadow-lg bg-white dark:bg-slate-800 overflow-hidden flex-shrink-0">
                  {!logoError && seller.store_logo ? (
                    <img loading="lazy" src={getImageUrl(seller.store_logo)} alt={seller.store_name}
                      className="w-full h-full object-cover"
                      onError={() => setLogoError(true)} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-green-50">
                      <span className="text-3xl font-bold text-green-600">
                        {seller.store_name?.[0]?.toUpperCase() || 'S'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="pb-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-slate-100">{seller.store_name}</h1>
                    {isVerified && (
                      <CheckBadgeSolid className="h-5 w-5 text-green-500 flex-shrink-0" title="Verified seller" />
                    )}
                  </div>
                  <Stars rating={rating} count={reviewCount} />
                  <TodayHours hours={seller.business_hours} enabled={seller.business_hours_enabled} />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pb-1">
                <div className="relative" data-share-panel>
                  <button
                    onClick={handleShare}
                    aria-label={shareOpen ? 'Close share menu' : 'Share store'}
                    className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-sm font-medium transition-colors
                      ${shareOpen
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                        : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                      }`}
                  >
                    <ShareIcon className="h-4 w-4" />
                    Share
                  </button>

                  {shareOpen && (() => {
                    const d = shareData();
                    return (
                      <div className="absolute right-0 top-full mt-2 z-50 w-72
                                      bg-white dark:bg-slate-800 border border-gray-200
                                      dark:border-slate-700 rounded-xl shadow-xl overflow-hidden">
                        {/* Title preview */}
                        <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700">
                          <p className="text-xs text-gray-500 dark:text-slate-400">Sharing</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 line-clamp-2">
                            {d.title}
                          </p>
                        </div>

                        {/* Platform links */}
                        {[
                          { label: "Facebook", href: d.facebook, icon: "f", desc: "Share to your feed", color: "hover:bg-blue-50 dark:hover:bg-blue-900/20" },
                          { label: "WhatsApp", href: d.whatsapp, icon: "W", desc: "Send to a chat", color: "hover:bg-green-50 dark:hover:bg-green-900/20" },
                          { label: "Viber", href: d.viber, icon: "V", desc: "Mobile app link", color: "hover:bg-purple-50 dark:hover:bg-purple-900/20" },
                          { label: "Telegram", href: d.telegram, icon: "T", desc: "Share to Telegram", color: "hover:bg-sky-50 dark:hover:bg-sky-900/20" },
                          { label: "X (Twitter)", href: d.twitter, icon: "X", desc: "Post on X", color: "hover:bg-gray-100 dark:hover:bg-slate-700" },
                        ].map(({ label, href, icon, desc, color }) => (
                          <a
                            key={label}
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setShareOpen(false)}
                            className={`flex items-start gap-3 px-4 py-2.5 transition-colors ${color}`}
                          >
                            <span className="mt-0.5 h-7 w-7 flex-shrink-0 rounded-full
                                             bg-gray-100 dark:bg-slate-700
                                             text-gray-800 dark:text-slate-200
                                             flex items-center justify-center text-xs font-bold">
                              {icon}
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold text-gray-800 dark:text-slate-200 leading-tight">
                                {label}
                              </span>
                              <span className="block text-xs text-gray-500 dark:text-slate-400 leading-tight">
                                {desc}
                              </span>
                            </span>
                          </a>
                        ))}

                        {/* Copy profile link */}
                        <button
                          onClick={async () => { await copyText(d.profileUrl); setShareOpen(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium
                                     border-t border-gray-100 dark:border-slate-700
                                     hover:bg-gray-50 dark:hover:bg-slate-700
                                     text-gray-700 dark:text-slate-300 transition-colors"
                        >
                          {copied
                            ? <><CheckIcon className="h-4 w-4 text-green-500" /> Copied profile link</>
                            : <><LinkIcon className="h-4 w-4" /> Copy profile link</>
                          }
                        </button>

                        {/* Website URL (if available) */}
                        {d.website && (
                          <button
                            onClick={async () => { await copyText(d.website); setShareOpen(false); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium
                                       border-t border-gray-100 dark:border-slate-700
                                       hover:bg-gray-50 dark:hover:bg-slate-700
                                       text-gray-700 dark:text-slate-300 transition-colors"
                          >
                            {copied
                              ? <><CheckIcon className="h-4 w-4 text-green-500" /> Copied website URL</>
                              : <><GlobeAltIcon className="h-4 w-4" /> Copy website URL</>
                            }
                          </button>
                        )}

                        <div className="px-4 py-2 border-t border-gray-100 dark:border-slate-700">
                          <p className="text-[11px] text-gray-400 dark:text-slate-500 leading-snug">
                            {d.description}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                {/* Follow button — hide on own store, sellers viewing another store, admins */}
                {!isOwnStore && (!user || user.type === 'buyer') && (
                  <div className="flex flex-col items-end gap-1">
                    <button onClick={toggleFollow} disabled={fwLoading}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50
                        ${following ? 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600' : 'bg-green-600 text-white hover:bg-green-700'}`}>
                      <UserGroupIcon className="h-4 w-4" />
                      <span className={fwLoading ? 'animate-pulse' : ''}>
                        {!user ? 'Follow' : following ? 'Following' : 'Follow'} · {fmtK(followers)}
                      </span>
                    </button>
                    {followError && (
                      <p className="text-xs text-red-500 max-w-[180px] text-right">{followError}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap gap-5 mt-4 text-sm text-gray-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <ShoppingBagIcon className="h-4 w-4 text-gray-400 dark:text-slate-600" />
                <strong className="text-gray-900 dark:text-slate-100">{fmtK(stats.total_products || products.length)}</strong> Products
              </span>
              <span className="flex items-center gap-1.5">
                <ShoppingBagIcon className="h-4 w-4 text-gray-400 dark:text-slate-600" />
                <strong className="text-gray-900 dark:text-slate-100">{fmtK(stats.total_orders || 0)}</strong> Orders
              </span>
              <span className="flex items-center gap-1.5">
                <UserGroupIcon className="h-4 w-4 text-gray-400 dark:text-slate-600" />
                <strong className="text-gray-900 dark:text-slate-100">{fmtK(followers)}</strong> Followers
              </span>
              <span className="flex items-center gap-1.5">
                <ClockIcon className="h-4 w-4 text-gray-400 dark:text-slate-600" />
                Member since {memberSince}
              </span>
            </div>

            {/* Description */}
            {seller.store_description && (
              <div className="mt-3 max-w-2xl">
                <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
                  {descriptionExpanded ? seller.store_description : descriptionPreview.preview}
                </p>
                {descriptionPreview.hasMore && (
                  <button
                    type="button"
                    onClick={() => setDescriptionExpanded(prev => !prev)}
                    className="mt-1 text-sm font-medium text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                  >
                    {descriptionExpanded ? 'Show Less' : 'Read More >>'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── Social links ─────────────────────────────────────────── */}
          {socialLinks.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {socialLinks.map(s => (
                <a key={s.key} href={s.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 dark:border-slate-700 text-xs font-medium text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:bg-slate-900 transition-colors">
                  <span style={{ color: s.color }}>{s.icon}</span>
                  {s.label}
                </a>
              ))}
            </div>
          )}

          {/* ── Tabs ─────────────────────────────────────────────────── */}
          <Tab.Group selectedIndex={activeTab} onChange={setActiveTab}>
            <Tab.List className="flex border-b border-gray-200 dark:border-slate-700 mb-6 overflow-x-auto scrollbar-hide">
              {tabs.map(t => (
                <Tab key={t.label}
                  className={({ selected }) =>
                    `px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors focus:outline-none
                    ${selected ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  {t.label}
                </Tab>
              ))}
            </Tab.List>

            <Tab.Panels>

              {/* ── Products ───────────────────────────────────────── */}
              <Tab.Panel>
                {products.length === 0 ? (
                  <div className="text-center py-16 text-gray-400 dark:text-slate-600">
                    <ShoppingBagIcon className="h-12 w-12 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">No products listed yet.</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 pb-6">
                      {products.map((p, idx) => (
                        <ProductCard
                          key={p.id}
                          product={p}
                          imagePriority={idx < 6 && productPage === 1}
                        />
                      ))}
                      {productsLoading && [...Array(4)].map((_, i) => (
                        <SkeletonProductCard key={`seller-more-${i}`} />
                      ))}
                    </div>
                    <div ref={productSentinelRef} className="h-1" />
                    {productsLoading && products.length > 0 && (
                      <div className="flex justify-center py-6">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-green-500 dark:border-slate-700" />
                      </div>
                    )}
                    {!productsHasMore && products.length > 0 && (
                      <p className="pb-10 text-center text-xs text-gray-400 dark:text-slate-500">
                        All products from this seller are loaded.
                      </p>
                    )}
                  </>
                )}
              </Tab.Panel>

              {/* ── Reviews ────────────────────────────────────────── */}
              <Tab.Panel>
                <div className="max-w-2xl space-y-6 pb-10">
                  {/* Rating summary */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-800 p-6 flex items-center gap-8">
                    <div className="text-center flex-shrink-0">
                      <div className="text-3xl sm:text-5xl font-bold text-gray-900 dark:text-slate-100">{rating.toFixed(1)}</div>
                      <Stars rating={rating} size="h-5 w-5" />
                      <div className="text-xs text-gray-400 dark:text-slate-600 mt-1">{reviewCount} reviews</div>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      {[5, 4, 3, 2, 1].map(star => {
                        const pct = reviewCount > 0 && stats[`star_${star}`]
                          ? Math.round((stats[`star_${star}`] / reviewCount) * 100) : 0;
                        return (
                          <div key={star} className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 dark:text-slate-500 w-3">{star}</span>
                            <StarSolid className="h-3 w-3 text-yellow-400 flex-shrink-0" />
                            <div className="flex-1 bg-gray-100 dark:bg-slate-800 rounded-full h-1.5">
                              <div className="bg-yellow-400 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-gray-400 dark:text-slate-600 w-6 text-right">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Write review */}
                  {!reviewForm.open && (
                    <button onClick={() => setReviewForm(f => ({ ...f, open: true }))}
                      className="flex items-center gap-2 text-sm font-medium text-green-600 hover:text-green-700">
                      <ChatBubbleLeftIcon className="h-4 w-4" /> Write a Review
                    </button>
                  )}

                  {reviewForm.open && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 space-y-4">
                      <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">Your Review</p>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(s => (
                          <button key={s} onClick={() => setReviewForm(f => ({ ...f, rating: s }))}
                            className="focus:outline-none transition-transform hover:scale-110">
                            <StarSolid className={`h-7 w-7 ${s <= reviewForm.rating ? 'text-yellow-400' : 'text-gray-200'}`} />
                          </button>
                        ))}
                      </div>
                      <textarea rows={3} value={reviewForm.comment}
                        onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))}
                        placeholder="Share your experience with this seller…"
                        className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-green-500 focus:outline-none resize-none" />
                      <div className="flex gap-2">
                        <button onClick={submitReview} disabled={!reviewForm.rating || reviewForm.submitting}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-colors">
                          {reviewForm.submitting ? 'Submitting…' : 'Submit Review'}
                        </button>
                        <button onClick={() => setReviewForm({ open: false, rating: 0, comment: '', submitting: false })}
                          className="px-4 py-2 border border-gray-200 dark:border-slate-700 text-sm text-gray-600 dark:text-slate-400 rounded-xl hover:bg-gray-50 dark:bg-slate-900">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Review list */}
                  {revLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-7 w-7 border-t-2 border-b-2 border-green-500" />
                    </div>
                  ) : reviews.data?.length === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-slate-600 text-center py-8">No reviews yet. Be the first!</p>
                  ) : (
                    reviews.data?.map(r => (
                      <div key={r.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-800 p-5">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{r.reviewer_name || r.user?.name || 'Anonymous'}</p>
                            <p className="text-xs text-gray-400 dark:text-slate-600">{new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                          </div>
                          <Stars rating={r.rating} size="h-4 w-4" />
                        </div>
                        {r.comment && <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed">{r.comment}</p>}
                      </div>
                    ))
                  )}

                  {/* Pagination */}
                  {reviews.meta?.last_page > 1 && (
                    <div className="flex justify-center gap-2">
                      {[...Array(reviews.meta.last_page)].map((_, i) => (
                        <button key={i} onClick={() => setRevPage(i + 1)}
                          className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors
                            ${revPage === i + 1 ? 'bg-green-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </Tab.Panel>

              {/* ── About ──────────────────────────────────────────── */}
              <Tab.Panel>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-10">

                  {/* Left: description + business info */}
                  <div className="lg:col-span-2 space-y-6">

                    {seller.store_description && (
                      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-800 p-6">
                        <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100 mb-3">About {seller.store_name}</h2>
                        <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">{seller.store_description}</p>
                      </div>
                    )}

                    {/* Business info */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-800 p-6">
                      <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100 mb-4">Business Information</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-sm">
                        {seller.business_type && (
                          <div>
                            <p className="text-xs font-medium text-gray-400 dark:text-slate-600 uppercase tracking-wide">Business Type</p>
                            <p className="text-gray-900 dark:text-slate-100 mt-0.5 capitalize">{seller.business_type}</p>
                          </div>
                        )}
                        {seller.year_established && (
                          <div>
                            <p className="text-xs font-medium text-gray-400 dark:text-slate-600 uppercase tracking-wide">Established</p>
                            <p className="text-gray-900 dark:text-slate-100 mt-0.5">{seller.year_established}</p>
                          </div>
                        )}
                        {seller.employees_count && (
                          <div>
                            <p className="text-xs font-medium text-gray-400 dark:text-slate-600 uppercase tracking-wide">Team Size</p>
                            <p className="text-gray-900 dark:text-slate-100 mt-0.5">{seller.employees_count} employees</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-medium text-gray-400 dark:text-slate-600 uppercase tracking-wide">Member Since</p>
                          <p className="text-gray-900 dark:text-slate-100 mt-0.5">{memberSince}</p>
                        </div>
                      </div>
                    </div>

                    {/* Business hours */}
                    {seller.business_hours_enabled && seller.business_hours && (
                      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-800 p-6">
                        <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                          <ClockIcon className="h-5 w-5 text-gray-400 dark:text-slate-600" /> Business Hours
                        </h2>
                        <div className="space-y-2">
                          {Object.entries(DAY_LABELS).map(([key, label]) => {
                            const h = seller.business_hours[key];
                            if (!h) return null;
                            const isToday = key === ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()];
                            return (
                              <div key={key} className={`flex justify-between items-center py-1.5 px-3 rounded-lg text-sm ${isToday ? 'bg-green-50' : ''}`}>
                                <span className={`font-medium ${isToday ? 'text-green-700' : 'text-gray-700'}`}>
                                  {label}{isToday && <span className="ml-1 text-xs text-green-500">(today)</span>}
                                </span>
                                {h.closed
                                  ? <span className="text-red-500">Closed</span>
                                  : <span className="text-gray-600 dark:text-slate-400">{h.open} – {h.close}</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: contact + social */}
                  <div className="space-y-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-800 p-6">
                      <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100 mb-4">Contact</h2>
                      <div className="space-y-3 text-sm">
                        {seller.address && (
                          <div className="flex gap-2.5">
                            <MapPinIcon className="h-4 w-4 text-gray-400 dark:text-slate-600 flex-shrink-0 mt-0.5" />
                            <span className="text-gray-600 dark:text-slate-400">
                              {[seller.address, seller.city, seller.state, seller.country].filter(Boolean).join(', ')}
                            </span>
                          </div>
                        )}

                        {seller.contact_email && (
                          <a href={`mailto:${seller.contact_email}`} className="flex gap-2.5 hover:text-green-600 group">
                            <EnvelopeIcon className="h-4 w-4 text-gray-400 dark:text-slate-600 flex-shrink-0 group-hover:text-green-500" />
                            <span className="text-gray-600 dark:text-slate-400 group-hover:text-green-600 break-all">{seller.contact_email}</span>
                          </a>
                        )}
                        {seller.website && (
                          <a href={seller.website.startsWith('http') ? seller.website : `https://${seller.website}`}
                            target="_blank" rel="noopener noreferrer"
                            className="flex gap-2.5 hover:text-green-600 group">
                            <GlobeAltIcon className="h-4 w-4 text-gray-400 dark:text-slate-600 flex-shrink-0 group-hover:text-green-500" />
                            <span className="text-green-600 break-all">{seller.website}</span>
                          </a>
                        )}
                      </div>
                      <a href={`mailto:${seller.contact_email}`}
                        className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-colors">
                        <ChatBubbleLeftIcon className="h-4 w-4" /> Contact Seller
                      </a>
                    </div>

                    {socialLinks.length > 0 && (
                      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-800 p-6">
                        <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100 mb-4">Follow Us</h2>
                        <div className="flex flex-wrap gap-2">
                          {socialLinks.map(s => (
                            <a key={s.key} href={s.url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-2 border border-gray-100 dark:border-slate-800 rounded-xl text-xs font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:bg-slate-900 transition-colors">
                              <span style={{ color: s.color }}>{s.icon}</span> {s.label}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Tab.Panel>

              {/* ── Policies (conditional) ─────────────────────────── */}
              {hasPolicies && (
                <Tab.Panel>
                  <div className="max-w-2xl space-y-4 pb-10">
                    {[
                      { key: 'return_policy', label: 'Return & Refund Policy' },
                      { key: 'shipping_policy', label: 'Shipping Policy' },
                      { key: 'warranty_policy', label: 'Warranty Policy' },
                      { key: 'privacy_policy', label: 'Privacy Policy' },
                      { key: 'terms_of_service', label: 'Terms of Service' },
                    ].filter(p => seller[p.key]).map(p => (
                      <details key={p.key} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden group">
                        <summary className="flex items-center justify-between px-6 py-4 cursor-pointer select-none list-none">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">{p.label}</h3>
                          <ArrowUpIcon className="h-4 w-4 text-gray-400 dark:text-slate-600 group-open:rotate-180 transition-transform flex-shrink-0" />
                        </summary>
                        <div className="px-6 pb-5 text-sm text-gray-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap border-t pt-2 border-gray-50">
                          {seller[p.key]}
                        </div>
                      </details>
                    ))}
                  </div>
                </Tab.Panel>
              )}

              {/* ── Delivery Zones ──────────────────────────────────── */}
              <Tab.Panel>
                <DeliveryZonesPanel
                  areas={deliveryAreas}
                  loading={deliveryLoading}
                  error={deliveryError}
                />
              </Tab.Panel>

            </Tab.Panels>
          </Tab.Group>
        </div>
      </div>
    </>
  );
};

export default SellerProfile;
