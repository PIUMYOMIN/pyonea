import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../../utils/api";
import CategoryForm from "./CategoryForm";

const CATEGORY_DASHBOARD_PATH = "/admin/dashboard?tab=categories";

const CategoryEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchCategory = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      
      const response = await api.get(`/admin/categories/${id}`);
      if (response.data.success) {
        setCategory(response.data.data);
      } else {
        setError("Failed to load category");
      }
    } catch (err) {
      console.error("Error fetching category:", err);
      setError(err.response?.data?.message || "Failed to load category");
    } finally {
      setLoading(false);
    }
  }, [id]); // Add id as dependency

  useEffect(() => {
    fetchCategory();
  }, [fetchCategory]); // Only run when fetchCategory changes

  const handleSuccess = () => {
    navigate(CATEGORY_DASHBOARD_PATH);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-red-800 dark:text-red-300">Error</h3>
              <div className="mt-2 text-red-700 dark:text-red-400">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => navigate(CATEGORY_DASHBOARD_PATH)}
                  className="text-sm font-medium text-red-600 hover:text-red-500"
                >
                  ← Back to Categories
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!category && !loading) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="text-center">
          <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">Category Not Found</h3>
          <p className="text-gray-500 dark:text-slate-400 mb-6">The category you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => navigate(CATEGORY_DASHBOARD_PATH)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            ← Back to Categories
          </button>
        </div>
      </div>
    );
  }

  return <CategoryForm mode="edit" category={category} onSuccess={handleSuccess} />;
};

export default CategoryEdit;
