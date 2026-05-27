import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import ProductForm from "./ProductForm";

const ProductEdit = ({ mode }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminMode = mode === "admin" || location.pathname.startsWith("/admin/");
  const returnPath = isAdminMode ? "/admin/dashboard" : "/seller/dashboard";

  const handleSuccess = () => {
    navigate(returnPath);
  };

  const handleCancel = () => {
    navigate(returnPath);
  };

  return (
    <ProductForm
      product={{ id: parseInt(id, 10) }}
      mode={isAdminMode ? "admin" : "seller"}
      onSuccess={handleSuccess}
      onCancel={handleCancel}
    />
  );
};

export default ProductEdit;
