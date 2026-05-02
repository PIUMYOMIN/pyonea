import React from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";
import { WishlistProvider } from "./context/WishlistContext";
import { CookieProvider } from "./context/CookieContext";
import { ThemeProvider } from "./context/ThemeContext";
import CookieBanner from "./components/ui/CookieBanner";
import { HelmetProvider } from "react-helmet-async";
import OrderTracking from "./pages/OrderTracking";
import { setNavigate } from "./utils/api";
import { trackPageView, isInitialised } from "./utils/analytics";

// Layout
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";

// Public Pages
import Home from "./pages/Home";
import ProductList from "./pages/ProductList";
import ProductDetail from "./pages/ProductDetail";
import CategoryBrowser from "./pages/CategoryBrowser";
import Sellers from "./pages/Sellers";
import SellerProfile from "./pages/SellerProfile";
import ProductComparison from "./pages/ProductComparison";
import BulkOrderTool from "./pages/BulkOrderTool";
import Pricing from "./pages/Pricing";
import AboutUs from "./pages/AboutUs";
import Legal from "./pages/Legal";
import HelpCenter from "./pages/HelpCenter";
import ReturnPolicy from './pages/ReturnPolicy';
import PrivacyPolicy from "./pages/PrivacyPolicy";
import SellerGuidelines from "./pages/SellerGuidelines";
import FAQ from "./pages/FAQ";
import ShippingInfo from "./pages/ShippingInfo";
import Contact from "./pages/Contact";

// Auth Pages
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import ForgotPassword from "./pages/Auth/ForgotPassword";
import ResetPassword from "./pages/Auth/ResetPassword";

// Protected Pages
import BuyerDashboard from "./pages/Client/BuyerDashboard";
import Wishlist from "./pages/Wishlist";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import SellerDashboard from "./pages/Seller/SellerDashboard";
import AdminDashboard from "./pages/Admin/AdminDashboard";

// Admin Management
import CategoryCreate from "./pages/Admin/categories/CategoryCreate";
import CategoryEdit from "./pages/Admin/categories/CategoryEdit";

// Seller Product Management
import ProductCreate from "./pages/Seller/products/ProductCreate";
import ProductEdit from "./pages/Seller/products/ProductEdit";
import ProductView from "./pages/Seller/products/ProductView";

import StoreBasicInfo from "./pages/Seller/StoreBasicInfo";
import BusinessDetails from "./pages/Seller/BusinessDetails";
import AddressInfo from "./pages/Seller/AddressInfo";
import DeliveryZonesOnboarding from "./pages/Seller/DeliveryZonesOnboarding";

// Common Components
import PaymentMethod from "./components/ui/PaymentMethod";
import PaymentSuccess from "./pages/PaymentSuccess";
import OrderConfirmation from "./components/ui/OrderConfirmation";
import RFQManager from "./pages/RFQManager";

// Route Guards
import ProtectedRoute from "./components/ProtectedRoute";
import GuestRoute from "./components/GuestRoute";
import OrderTrackingPage from "./pages/OrderTrackingPage";
import DocumentUpload from './pages/Seller/DocumentUpload';
import SellerDashboardRedirect from './components/seller/SellerDashboardRedirect';
import ReviewSubmit from "./pages/Seller/ReviewSubmit";
import StepGuard from "./components/StepGuard";
import Error from "./pages/Errors/404";
import SellerRouteGuard from "./components/SellerRouteGuard";
import MyStore from "./components/seller/MyStore";
import FinancialReports from "./components/admin/FinancialReports";
import VerifiedSellerList from "./components/admin/VerifiedSellerList";

import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';

const Unsubscribe = React.lazy(() => import("./pages/Unsubscribe"));
const NewsletterConfirm = React.lazy(() => import("./pages/NewsletterConfirm"));
const EmailVerification = React.lazy(() => import("./pages/Email/EmailVerification"));
const MyReports   = React.lazy(() => import("./pages/MyReports"));
const ReportPage  = React.lazy(() => import("./pages/ReportPage"));

const NavigationWirer = () => {
  const navigate = useNavigate();
  React.useEffect(() => {
    setNavigate(navigate);
  }, [navigate]);
  return null;
};

// Tracks a GA4 pageview on every route change, but only when the user
// has accepted analytics cookies (GA is not yet initialised otherwise).
const GARouteTracker = () => {
  const location = useLocation();
  React.useEffect(() => {
    if (isInitialised()) {
      trackPageView(location.pathname + location.search);
    }
  }, [location]);
  return null;
};

function App() {
  return (
    <HelmetProvider>
      <I18nextProvider i18n={i18n}>
        <GoogleReCaptchaProvider reCaptchaKey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}>
          <AuthProvider>
            <CartProvider>
              <Router>
                <NavigationWirer />
                <GARouteTracker />
                <WishlistProvider>
                  <CookieProvider>
                  <ThemeProvider>
                  <div className="flex flex-col min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] theme-transition">
                    <Header />
                    <main className="flex-grow">
                      <Routes>
                        {/* Public Routes */}
                        <Route path="/" element={<Home />} />
                        <Route path="/products" element={<ProductList />} />
                        <Route path="/products/:slug" element={<ProductDetail />} />
                        <Route path="/categories" element={<CategoryBrowser />} />
                        <Route path="/sellers" element={<Sellers />} />
                        <Route path="/sellers/:slug" element={<SellerProfile />} />
                        <Route path="/product-comparison" element={<ProductComparison />} />
                        <Route path="/bulk-order-tool" element={<BulkOrderTool />} />
                        <Route path="/order-tracking" element={<OrderTracking />} />
                        <Route path="/track-order" element={<OrderTracking />} />
                        <Route path="/pricing" element={<Pricing />} />
                        <Route path="/about-us" element={<AboutUs />} />
                        <Route path="/terms" element={<Legal />} />
                        <Route path="/help" element={<HelpCenter />} />
                        <Route path="/legal" element={<Legal />} />
                        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                        <Route path="/return-policy" element={<ReturnPolicy />} />
                        <Route path="/seller-guidelines" element={<SellerGuidelines />} />
                        <Route path="/faq" element={<FAQ />} />
                        <Route path="/shipping" element={<ShippingInfo />} />
                        <Route path="/contact" element={<Contact />} />
                        <Route path="/page-not-found" element={<Error />} />
                        <Route path="/reset-password" element={<ResetPassword />} />
                        <Route
                          path="/verify-email/:id/:hash"
                          element={
                            <React.Suspense fallback={null}>
                              <EmailVerification />
                            </React.Suspense>
                          }
                        />
                        <Route
                          path="/verify-email"
                          element={
                            <React.Suspense fallback={null}>
                              <EmailVerification />
                            </React.Suspense>
                          }
                        />
                        <Route
                          path="/unsubscribe"
                          element={
                            <React.Suspense fallback={<div>Loading…</div>}>
                              <Unsubscribe />
                            </React.Suspense>
                          }
                        />
                        <Route
                          path="/newsletter/confirm"
                          element={
                            <React.Suspense fallback={<div>Loading…</div>}>
                              <NewsletterConfirm />
                            </React.Suspense>
                          }
                        />
                        {/* Auth Routes */}
                        {/* Guest-only Routes */}
                        <Route path="/login" element={
                          <GuestRoute>
                            <Login />
                          </GuestRoute>} />
                        <Route path="/register" element={
                          <GuestRoute>
                            <Register />
                          </GuestRoute>} />
                        <Route path="/forgot-password" element={
                          <GuestRoute>
                            <ForgotPassword />
                          </GuestRoute>} />
                        {/* Protected Routes */}
                        <Route path="/seller" element={
                          <ProtectedRoute roles={["seller"]}>
                            <SellerDashboardRedirect />
                          </ProtectedRoute>
                        } />

                        <Route path="/seller/dashboard" element={
                          <ProtectedRoute roles={["seller"]}>
                            <SellerDashboard />
                          </ProtectedRoute>
                        } />

                        <Route path="/seller/onboarding/store-basic" element={
                          <ProtectedRoute roles={["seller"]}>
                            <StepGuard step="store-basic">
                              <StoreBasicInfo />
                            </StepGuard>
                          </ProtectedRoute>
                        } />

                        <Route path="/seller/onboarding/business-details" element={
                          <ProtectedRoute roles={["seller"]}>
                            <StepGuard step="business-details">
                              <BusinessDetails />
                            </StepGuard>
                          </ProtectedRoute>
                        } />

                        <Route path="/seller/onboarding/address" element={
                          <ProtectedRoute roles={["seller"]}>
                            <StepGuard step="address">
                              <AddressInfo />
                            </StepGuard>
                          </ProtectedRoute>
                        } />

                        <Route path="/seller/onboarding/delivery-zones" element={
                          <ProtectedRoute roles={["seller"]}>
                            <StepGuard step="delivery-zones">
                              <DeliveryZonesOnboarding />
                            </StepGuard>
                          </ProtectedRoute>
                        } />

                        <Route path="/seller/onboarding/documents" element={
                          <ProtectedRoute roles={["seller"]}>
                            <StepGuard step="documents">
                              <DocumentUpload />
                            </StepGuard>
                          </ProtectedRoute>
                        } />

                        <Route path="/seller/onboarding/review-submit" element={
                          <ProtectedRoute roles={["seller"]}>
                            <StepGuard step="review-submit">
                              <ReviewSubmit />
                            </StepGuard>
                          </ProtectedRoute>
                        } />

                        <Route path="/seller/my-store" element={
                          <ProtectedRoute roles={["seller"]}>
                            <SellerRouteGuard>
                              <MyStore />
                            </SellerRouteGuard>
                          </ProtectedRoute>
                        } />

                        {/* Other seller routes that require complete onboarding */}
                        <Route path="/seller/products" element={
                          <ProtectedRoute roles={["seller"]}>
                            <SellerRouteGuard>
                              <ProductView />
                            </SellerRouteGuard>
                          </ProtectedRoute>
                        } />

                        {/* Buyer Routes */}
                        <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
                        <Route path="/payment" element={<ProtectedRoute roles={["buyer"]}><PaymentMethod /></ProtectedRoute>} />
                        <Route path="/checkout" element={<ProtectedRoute roles={["buyer"]}><Checkout /></ProtectedRoute>} />
                        <Route path="/buyer" element={<ProtectedRoute roles={["buyer"]}><BuyerDashboard /></ProtectedRoute>} />
                        <Route path="/buyer/dashboard" element={<ProtectedRoute roles={["buyer"]}><BuyerDashboard /></ProtectedRoute>} />
                        <Route path="/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />

                        <Route path="/seller/products/create" element={<ProtectedRoute roles={["seller"]}><ProductCreate /></ProtectedRoute>} />
                        <Route path="/seller/products/:id/edit" element={<ProtectedRoute roles={["seller"]}><ProductEdit /></ProtectedRoute>} />

                        {/* Admin Routes */}
                        <Route path="/admin" element={<ProtectedRoute roles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
                        <Route path="/admin/dashboard" element={<ProtectedRoute roles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
                        <Route path="/admin/categories/create" element={<ProtectedRoute roles={["admin"]}><CategoryCreate /></ProtectedRoute>} />
                          <Route path="/admin/categories/:id/edit" element={<ProtectedRoute roles={["admin"]}><CategoryEdit /></ProtectedRoute>} />
                          
                          <Route path="/admin/financial-reports" element={
                          <ProtectedRoute roles={["admin"]}>
                            <FinancialReports />
                          </ProtectedRoute>
                        } />

                        {/* Shared Routes */}
                        <Route path="/rfq" element={<ProtectedRoute roles={["buyer", "seller", "admin"]}><RFQManager /></ProtectedRoute>} />
                        <Route path="/payment-method" element={<ProtectedRoute roles={["buyer", "seller", "admin"]}><PaymentMethod /></ProtectedRoute>} />
                        <Route path="/order-confirmation" element={<ProtectedRoute roles={["buyer", "seller", "admin"]}><OrderConfirmation /></ProtectedRoute>} />
                        <Route path="/order-tracking/:orderId" element={<ProtectedRoute><OrderTrackingPage /></ProtectedRoute>} />
                        {/* ── PaymentSuccess ── */}
                        <Route path="/payment-success" element={
                          <ProtectedRoute>
                            <PaymentSuccess />
                          </ProtectedRoute>
                        } />

                        {/* ── Report Page (public) ── */}
                        <Route path="/report" element={
                          <React.Suspense fallback={null}>
                            <ReportPage />
                          </React.Suspense>
                        } />

                        {/* ── My Reports ── */}
                        <Route path="/my-reports" element={
                          <ProtectedRoute>
                            <React.Suspense fallback={<div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-green-500" /></div>}>
                              <MyReports />
                            </React.Suspense>
                          </ProtectedRoute>
                        } />
                        <Route path="/my-reports/:ticket_id" element={
                          <ProtectedRoute>
                            <React.Suspense fallback={null}>
                              <MyReports />
                            </React.Suspense>
                          </ProtectedRoute>
                        } />

                        {/* Catch-all 404 — must be LAST */}
                        <Route path="*" element={<Error />} />
                      </Routes>
                    </main>
                    <Footer />
                    <CookieBanner />
                  </div>
                  </ThemeProvider>
                  </CookieProvider>
                </WishlistProvider>
              </Router>
            </CartProvider>
          </AuthProvider>
        </GoogleReCaptchaProvider>
      </I18nextProvider>
    </HelmetProvider>);
}

export default App;