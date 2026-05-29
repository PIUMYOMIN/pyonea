import React from "react";
import { StarIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";

const ReviewCard = ({ review }) => {
  const { t } = useTranslation();

  // Render star ratings
  const renderStars = rating => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(
          <StarIcon
            key={i}
            className="h-5 w-5 text-yellow-400"
            fill="currentColor"
          />
        );
      } else if (i === fullStars + 1 && hasHalfStar) {
        stars.push(
          <StarIcon
            key={i}
            className="h-5 w-5 text-yellow-400"
            fill="currentColor"
          />
        );
      } else {
        stars.push(
          <StarIcon
            key={i}
            className="h-5 w-5 text-gray-300"
            fill="currentColor"
          />
        );
      }
    }

    return stars;
  };

  return (
    <div className="border-b border-gray-200 pb-6 last:border-0 last:pb-0">
      <div className="flex items-center">
        <div className="bg-gray-200 border-2 border-dashed rounded-full w-10 h-10" />
        <div className="ml-4">
          <h4 className="text-sm font-medium text-gray-900">
            {review.user?.name || t("seller.reviews.unknown_user")}
          </h4>
          <div className="mt-1 flex items-center">
            {renderStars(review.rating)}
            <span className="ml-2 text-sm text-gray-500">
              {review.date}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-gray-600">{review.comment}</p>
        {review.product && (
          <p className="mt-2 text-sm text-gray-500">
            <span className="font-medium">{t("seller.reviews.for_product")}:</span> {review.product?.name || t("seller.reviews.unknown_product")}
          </p>
        )}
      </div>
    </div>
  );
};

export default ReviewCard;
