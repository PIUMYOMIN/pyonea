import React from "react";
import { Routes, Route } from "react-router-dom";
import CategoryManagement from "../../components/admin/CategoryManagement";
import CategoryCreate from "./categories/CategoryCreate";
import CategoryEdit from "./categories/CategoryEdit";

const Categories = () => {
  return (
    <Routes>
      <Route path="/" element={<CategoryManagement />} />
      <Route path="/create" element={<CategoryCreate />} />
      <Route path="/:id/edit" element={<CategoryEdit />} />
    </Routes>
  );
};

export default Categories;
