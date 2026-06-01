import React from "react";
import { Link } from "react-router-dom";
import { StarIcon, CheckBadgeIcon } from "@heroicons/react/24/solid";
import { motion } from "framer-motion";
import { getImageUrl } from "../../utils/imageHelpers";

const SellerCard = ({ seller }) => {
  const apiSeller = seller.originalData || seller;
  
  const storeName = apiSeller.store_name || 'Unknown Seller';
  const slug = apiSeller.store_slug;
  const displayRating = Number(apiSeller.reviews_avg_rating) || 0;
  const reviewsCount = apiSeller.reviews_count || 0;
  const productsCount = apiSeller.products_count || 0;
  const city = apiSeller.city || apiSeller.user?.city || 'Unknown City';
  const storeLogo = apiSeller.store_logo ? getImageUrl(apiSeller.store_logo) : null;
  const businessType = apiSeller.business_type || "General Merchant";
  const isVerified = apiSeller.status === 'approved' || apiSeller.status === 'active';
  
  const renderStars = (rating) => {
    if (!rating || rating === 0) {
      return (
        <div className="flex items-center">
          {[...Array(5)].map((_, i) => (
            <StarIcon key={i} className="h-3 w-3 sm:h-4 sm:w-4 text-gray-300" />
          ))}
                  <span className="ml-1 text-xs sm:text-sm text-gray-500 dark:text-slate-400">No ratings</span>
        </div>
      );
    }

    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(<StarIcon key={i} className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-400" fill="currentColor" />);
      } else if (i === fullStars + 1 && hasHalfStar) {
        stars.push(<StarIcon key={i} className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-400" fill="currentColor" />);
      } else {
        stars.push(<StarIcon key={i} className="h-3 w-3 sm:h-4 sm:w-4 text-gray-300" />);
      }
    }
    
    return stars;
  };

  return (
    <motion.div
className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 overflow-hidden hover:shadow-lg dark:hover:shadow-slate-900/75 transition-shadow duration-300 border border-gray-100 dark:border-slate-700"
      whileHover={{ y: -5 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="p-3 sm:p-4">
        <div className="flex items-start space-x-2 sm:space-x-3">
          {/* Seller Logo */}
          <div className="flex-shrink-0 relative">
            {storeLogo ? (
              <div className="relative">
                <img
                  src={storeLogo}
                  alt={storeName}
className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-gray-200 dark:border-slate-600"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const fallback = e.target.parentElement?.nextElementSibling;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              </div>
            ) : null}
            
            <div 
              className={`${storeLogo ? 'hidden' : 'flex'} relative bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-700 dark:to-slate-600 border-2 border-dashed border-gray-300 dark:border-slate-500 rounded-full w-12 h-12 sm:w-16 sm:h-16 items-center justify-center`}
            >
              <span className="text-gray-500 dark:text-slate-400 font-semibold text-base sm:text-lg">
                {storeName.charAt(0).toUpperCase()}
              </span>
              {isVerified && (
                <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 rounded-full p-0.5">
                  <CheckBadgeIcon className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                </div>
              )}
            </div>
          </div>
          
          {/* Seller Info */}
          <div className="flex-1 min-w-0">
            <Link to={`/sellers/${slug}`} className="block">
<h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-slate-100 hover:text-green-700 dark:hover:text-green-400 transition-colors duration-200 line-clamp-1">
                {storeName}
              </h3>
            </Link>
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:flex-wrap gap-0.5 sm:gap-1 mt-1">
                <span className="inline-flex items-center px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 truncate max-w-[120px] sm:max-w-none">
                {businessType}
              </span>
              {city && (
              <span className="text-xs text-gray-500 dark:text-slate-400 truncate">
                  {city}
                </span>
              )}
            </div>
            
            <div className="flex items-center mt-1 sm:mt-2">
              <div className="flex items-center">
                {renderStars(displayRating)}
                {displayRating > 0 && (
                  <span className="ml-1 text-xs sm:text-sm font-medium text-gray-900 dark:text-slate-100">
                    {displayRating.toFixed(1)}
                  </span>
                )}
              </div>
              {reviewsCount > 0 && (
                <>
                  <span className="mx-1 sm:mx-2 text-gray-300 dark:text-slate-600">•</span>
                  <span className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">
                    {reviewsCount}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-3 sm:mt-4 grid grid-cols-2 gap-2">
          <div className="bg-green-50 dark:bg-green-900/30 p-1.5 sm:p-2 rounded-lg text-center border border-green-100 dark:border-green-800">
            <p className="text-base sm:text-lg font-semibold text-green-700 dark:text-green-400">{productsCount}</p>
            <p className="text-xs text-green-600 dark:text-green-400">Products</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/30 p-1.5 sm:p-2 rounded-lg text-center border border-blue-100 dark:border-blue-800">
            <p className="text-base sm:text-lg font-semibold text-blue-700 dark:text-blue-400">{reviewsCount}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400">Reviews</p>
          </div>
        </div>

        {/* View Store Button */}
        <Link
          to={`/sellers/${slug}`}
          className="mt-3 sm:mt-4 w-full block text-center bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium py-1.5 sm:py-2 px-3 sm:px-4 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md text-sm sm:text-base"
        >
          View Store
        </Link>
      </div>
    </motion.div>
  );
};

export default SellerCard;
