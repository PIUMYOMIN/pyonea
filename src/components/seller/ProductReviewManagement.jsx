import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  StarIcon,
  ChatBubbleLeftIcon,
  ArrowUturnLeftIcon,
  EllipsisVerticalIcon
} from "@heroicons/react/24/outline";
import api from "../../utils/api";

const ProductReviewManagement = () => {
  const { t, i18n } = useTranslation();
  const [activeFilter, setActiveFilter] = useState("all");
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchReviews();
  }, [currentPage]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await api.get(
        `seller/products/reviews?page=${currentPage}`
      );

      if (response.data.success) {
        setReviews(response.data.data.data);
        setTotalPages(response.data.data.last_page);
      }
    } catch (err) {
      setError(t("seller.reviews.fetch_error"));
      console.error("Error fetching reviews:", err);
    } finally {
      setLoading(false);
    }
  };

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

  const ratingCounts = [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: reviews.filter(r => r.rating === rating).length,
    percent:
      reviews.length > 0
        ? (reviews.filter(r => r.rating === rating).length / reviews.length) * 100
        : 0
  }));

  const filteredReviews =
    activeFilter === "all"
      ? reviews
      : reviews.filter(review => review.rating === parseInt(activeFilter));

  const formatDate = dateString => {
    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString(i18n.language === "my" ? "my-MM" : undefined, options);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-900/50 p-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100 mb-6">
          {t("seller.reviews.loading")}
        </h2>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-900/50 p-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100 mb-6">
          {t("seller.reviews.error_title")}
        </h2>
        <div className="text-center text-red-500 dark:text-red-400 py-8">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-900/50 p-6">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100 mb-6">
        {t("seller.reviews.title")}
      </h2>

      {/* Review Summary */}
      <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-6 mb-8 border border-gray-100 dark:border-slate-600">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex items-center mb-4 md:mb-0">
            <div className="text-3xl sm:text-5xl font-bold text-gray-900 dark:text-slate-100 mr-4">
              {averageRating.toFixed(1)}
            </div>
            <div>
              <div className="flex">
                {[1, 2, 3, 4, 5].map(star => (
                  <StarIcon
                    key={star}
                    className={`h-6 w-6 ${
                      star <= Math.round(averageRating)
                        ? "text-yellow-400"
                        : "text-gray-300"
                    }`}
                    fill={
                      star <= Math.round(averageRating)
                        ? "currentColor"
                        : "none"
                    }
                  />
                ))}
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                {t("seller.reviews.based_on", { count: reviews.length })}
              </p>
            </div>
          </div>

          {/* Rating bars – stack on mobile */}
          <div className="w-full md:w-auto space-y-2">
            {ratingCounts.map(({ rating, count, percent }) => (
              <div key={rating} className="flex items-center">
                <div className="w-24 bg-gray-200 dark:bg-slate-600 rounded-full h-2.5 mr-3">
                  <div
                    className="bg-yellow-400 h-2.5 rounded-full"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-900 dark:text-slate-100 mr-1">
                    {rating}
                  </span>
                  <StarIcon className="h-4 w-4 text-yellow-400" />
                </div>
                <span className="text-sm text-gray-500 dark:text-slate-400 ml-1">({count})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Review Filters – wrap with scroll on overflow */}
      <div className="flex flex-wrap gap-2 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveFilter("all")}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
            activeFilter === "all"
              ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
              : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600"
          }`}
        >
          {t("seller.reviews.all_reviews")} ({reviews.length})
        </button>
        {ratingCounts.map(({ rating, count }) => (
          <button
            key={rating}
            onClick={() => setActiveFilter(rating.toString())}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
              activeFilter === rating.toString()
                ? rating === 5
                  ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                  : rating === 4
                  ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                  : rating === 3
                  ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300"
                  : rating === 2
                  ? "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300"
                  : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600"
            }`}
          >
            {rating} {t("seller.reviews.star")} ({count})
          </button>
        ))}
      </div>

      {/* Reviews List */}
      <div className="space-y-6">
        {filteredReviews.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-slate-400">
            {t("seller.reviews.no_reviews_found")}
          </div>
        ) : (
          filteredReviews.map(review => (
            <div key={review.id} className="border border-gray-200 dark:border-slate-700 rounded-lg p-6">
              <div className="flex flex-wrap justify-between items-start gap-2">
                <div className="flex items-center min-w-0 flex-1">
                  <div className="bg-gray-200 border-2 border-dashed rounded-full w-10 h-10 flex-shrink-0" />
                  <div className="ml-4 min-w-0">
                    <h4 className="font-medium text-gray-900 dark:text-slate-100 truncate">
                      {review.user?.name || t("seller.reviews.unknown_user")}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      {formatDate(review.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center flex-shrink-0">
                  <div className="flex mr-4">
                    {[1, 2, 3, 4, 5].map(star => (
                      <StarIcon
                        key={star}
                        className={`h-5 w-5 ${
                          star <= review.rating
                            ? "text-yellow-400"
                            : "text-gray-300"
                        }`}
                        fill={star <= review.rating ? "currentColor" : "none"}
                      />
                    ))}
                  </div>
                  <button className="text-gray-400 hover:text-gray-600">
                    <EllipsisVerticalIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-gray-700 dark:text-slate-200">{review.comment} </p>
                <div className="mt-3 flex flex-wrap items-center text-sm text-gray-500">
                  <span className="mr-2 text-gray-500 dark:text-slate-400">
                    {t("seller.reviews.for_product")}:
                  </span>
                  <span className="font-medium text-gray-900 dark:text-slate-100 truncate">
                    {review.product?.name || review.product?.name_en || t("seller.reviews.unknown_product")}
                  </span>
                </div>
              </div>

              {review.reply ? (
                <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <ChatBubbleLeftIcon className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">
                        {t("seller.reviews.your_response")}
                      </h4>
                      <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                        {review.reply}
                      </p>
                      <div className="mt-2 text-sm">
                        <button className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300">
                          {t("seller.reviews.edit_response")}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4">
                  <button className="inline-flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                    <ArrowUturnLeftIcon className="h-4 w-4 mr-1" />
                    {t("seller.reviews.reply_to_review")}
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination – stack on mobile */}
      {totalPages > 1 && (
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md ${
              currentPage === 1
                ? "border-gray-300 dark:border-slate-600 text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-700 cursor-not-allowed"
                : "border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700"
            }`}
          >
            {t("seller.previous")}
          </button>
          <div className="text-sm text-gray-700 dark:text-slate-300">
            {t("seller.page")}{" "}
            <span className="font-medium">{currentPage}</span> {t("seller.of")}{" "}
            <span className="font-medium">{totalPages}</span>
          </div>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md ${
              currentPage === totalPages
                ? "border-gray-300 dark:border-slate-600 text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-700 cursor-not-allowed"
                : "border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700"
            }`}
          >
            {t("seller.next")}
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductReviewManagement;
