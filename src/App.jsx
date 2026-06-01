//src/App.jsx
import React, { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import i18n from "./i18n";

// ─── Contexts (eager — needed before first render) ────────────────────────────
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { I18nextProvider } from "react-i18next";
import { WishlistProvider } from "./context/WishlistContext";
import { CompareProvider } from "./context/CompareContext";
import { CookieProvider } from "./context/CookieContext";
import { ThemeProvider } from "./context/ThemeContext";
import { NotificationProvider } from './context/NotificationContext';
import { SubscriptionProvider } from './context/SubscriptionContext';
import { HelmetProvider } from "react-helmet-async";
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';

// Shorthand — avoids repeating the env var on every route
const RC_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
const WithRC = ({ children }) => (
  <GoogleReCaptchaProvider reCaptchaKey={RC_KEY}>
    {children}
  </GoogleReCaptchaProvider>
);
import { GoogleOAuthProvider } from "@react-oauth/google";

// ─── Guards & Layout (eager — needed for routing shell) ───────────────────────
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import GuestRoute from "./components/GuestRoute";
import StepGuard from "./components/StepGuard";
import SellerRouteGuard from "./components/SellerRouteGuard";
import CookieBanner from "./components/ui/CookieBanner";
import FloatingCompareButton from "./components/ui/FloatingCompareButton";

import { setNavigate } from "./utils/api";
import { trackPageView, isInitialised } from "./utils/analytics";

// ─── Pages (lazy — each loads only when its route is visited) ─────────────────

// Public
const Home                    = lazy(() => import("./pages/Home"));
const ProductList             = lazy(() => import("./pages/ProductList"));
const ProductDetail           = lazy(() => import("./pages/ProductDetail"));
const CategoryBrowser         = lazy(() => import("./pages/CategoryBrowser"));
const Sellers                 = lazy(() => import("./pages/Sellers"));
const SellerProfile           = lazy(() => import("./pages/SellerProfile"));
const ProductComparison       = lazy(() => import("./pages/ProductComparison"));
const BulkOrderTool           = lazy(() => import("./pages/BulkOrderTool"));
const Pricing                 = lazy(() => import("./pages/Pricing"));
const AboutUs                 = lazy(() => import("./pages/AboutUs"));
const Legal                   = lazy(() => import("./pages/Legal"));
const HelpCenter              = lazy(() => import("./pages/HelpCenter"));
const ReturnPolicy            = lazy(() => import("./pages/ReturnPolicy"));
const PrivacyPolicy           = lazy(() => import("./pages/PrivacyPolicy"));
const SellerGuidelines        = lazy(() => import("./pages/SellerGuidelines"));
const FAQ                     = lazy(() => import("./pages/FAQ"));
const ShippingInfo            = lazy(() => import("./pages/ShippingInfo"));
const Contact                 = lazy(() => import("./pages/Contact"));
const LocalDeals              = lazy(() => import("./pages/LocalDeals"));
const Blog                    = lazy(() => import("./pages/Blog"));
const BlogDetail              = lazy(() => import("./pages/BlogDetail"));
const RFQManager              = lazy(() => import("./pages/RFQManager"));
const OrderTracking           = lazy(() => import("./pages/OrderTracking"));
const OrderTrackingPage       = lazy(() => import("./pages/OrderTrackingPage"));

// Auth
const Login                   = lazy(() => import("./pages/Auth/Login"));
const Register                = lazy(() => import("./pages/Auth/Register"));
const ForgotPassword          = lazy(() => import("./pages/Auth/ForgotPassword"));
const ResetPassword           = lazy(() => import("./pages/Auth/ResetPassword"));
const SocialRoleSelect        = lazy(() => import("./pages/Auth/SocialRoleSelect"));

// Buyer
const BuyerDashboard          = lazy(() => import("./pages/Client/BuyerDashboard"));
const Wishlist                = lazy(() => import("./pages/Wishlist"));
const Cart                    = lazy(() => import("./pages/Cart"));
const Checkout                = lazy(() => import("./pages/Checkout"));
const PaymentMethod           = lazy(() => import("./components/ui/PaymentMethod"));
const PaymentSuccess          = lazy(() => import("./pages/PaymentSuccess"));
const OrderConfirmation       = lazy(() => import("./components/ui/OrderConfirmation"));

// Seller
const SellerDashboard         = lazy(() => import("./pages/Seller/SellerDashboard"));
const SellerDashboardRedirect = lazy(() => import("./components/seller/SellerDashboardRedirect"));
const ProductCreate           = lazy(() => import("./pages/Seller/products/ProductCreate"));
const ProductEdit             = lazy(() => import("./pages/Seller/products/ProductEdit"));
const ProductView             = lazy(() => import("./pages/Seller/products/ProductView"));

// Seller Onboarding
const StoreBasicInfo          = lazy(() => import("./pages/Seller/StoreBasicInfo"));
const BusinessDetails         = lazy(() => import("./pages/Seller/BusinessDetails"));
const AddressInfo             = lazy(() => import("./pages/Seller/AddressInfo"));
const DeliveryZonesOnboarding = lazy(() => import("./pages/Seller/DeliveryZonesOnboarding"));
const DocumentUpload          = lazy(() => import("./pages/Seller/DocumentUpload"));
const ReviewSubmit            = lazy(() => import("./pages/Seller/ReviewSubmit"));
import OnboardingLayout from "./components/OnboardingLayout";
import SellerOnboardingRoute from "./components/SellerOnboardingRoute";

// Admin
const AdminDashboard          = lazy(() => import("./pages/Admin/AdminDashboard"));
const CategoryCreate          = lazy(() => import("./pages/Admin/categories/CategoryCreate"));
const CategoryEdit            = lazy(() => import("./pages/Admin/categories/CategoryEdit"));
const FinancialReports        = lazy(() => import("./components/admin/FinancialReports"));

// Email / misc (already lazy)
const Unsubscribe             = lazy(() => import("./pages/Unsubscribe"));
const NewsletterConfirm       = lazy(() => import("./pages/NewsletterConfirm"));
const EmailVerification       = lazy(() => import("./pages/Email/EmailVerification"));
const MyReports               = lazy(() => import("./pages/MyReports"));
const ReportPage              = lazy(() => import("./pages/ReportPage"));
const Error                   = lazy(() => import("./pages/Errors/404"));

// ─── Suspense fallback ────────────────────────────────────────────────────────
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
    <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

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

// Ensure SPA route changes start at top of page.
const ScrollToTopOnRouteChange = () => {
  const { pathname, search } = useLocation();
  React.useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  React.useLayoutEffect(() => {
    const scrollToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    scrollToTop();
    const frame = window.requestAnimationFrame(scrollToTop);
    const timer = window.setTimeout(scrollToTop, 0);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [pathname, search]);
  return null;
};

function App() {
  return (
    <HelmetProvider>
      <I18nextProvider i18n={i18n}>
        <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ""}>
            <AuthProvider>
              <SubscriptionProvider>
              <NotificationProvider>
                <CartProvider>
                <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <NavigationWirer />
                <GARouteTracker />
                <ScrollToTopOnRouteChange />
                <WishlistProvider>
                  <CompareProvider>
                  <CookieProvider>
                  <ThemeProvider>
                  <div className="flex flex-col min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] theme-transition">
                    <Header />
                    <main className="flex-grow">
                      <Suspense fallback={<PageLoader />}>
                      <Routes>
                        {/* Public Routes */}
                        <Route path="/" element={<Home />} />
                        <Route path="/products" element={<ProductList />} />
                        <Route path="/products/:slug" element={<ProductDetail />} />
                        <Route path="/categories" element={<CategoryBrowser />} />
                        <Route path="/sellers" element={<Sellers />} />
                        <Route path="/sellers/:slug" element={<SellerProfile />} />
                        <Route path="/product-comparison" element={<ProductComparison />} />
                        <Route path="/compare" element={<ProductComparison />} />
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
                        <Route path="/contact" element={<WithRC><Contact /></WithRC>} />
                        <Route path="/page-not-found" element={<Error />} />
                        <Route path="/reset-password" element={<WithRC><ResetPassword /></WithRC>} />
                        <Route path="/local-deals" element={<LocalDeals />} />
                        <Route path="/blog" element={<Blog />} />
                        <Route path="/blog/:slug" element={<BlogDetail />} />
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
                            <React.Suspense fallback={""}>
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
                            <WithRC><Login /></WithRC>
                          </GuestRoute>} />
                        <Route path="/register" element={
                          <GuestRoute>
                            <WithRC><Register /></WithRC>
                          </GuestRoute>} />
                        <Route path="/register-seller" element={
                          <GuestRoute>
                            <WithRC><Register /></WithRC>
                          </GuestRoute>} />
                        <Route path="/forgot-password" element={
                          <GuestRoute>
                            <WithRC><ForgotPassword /></WithRC>
                          </GuestRoute>} />
                        <Route
                          path="/social/role"
                          element={
                            <GuestRoute>
                              <SocialRoleSelect />
                            </GuestRoute>
                          }
                        />
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

                                    {/* 3-step onboarding: Register → Business Setup → Dashboard
                             Old deep-link URLs redirect back to store-basic or dashboard */}
                                    <Route path="/seller/onboarding/business-details"
                                      element={<Navigate to="/seller/onboarding/store-basic" replace />} />
                                    <Route path="/seller/onboarding/address"
                                      element={<Navigate to="/seller/onboarding/store-basic" replace />} />
                                    <Route path="/seller/onboarding/delivery-zones"
                                      element={<Navigate to="/seller/onboarding/store-basic" replace />} />
                                    <Route path="/seller/onboarding/documents"
                                      element={<Navigate to="/seller/dashboard" replace />} />
                                    <Route path="/seller/onboarding/review-submit"
                                      element={<Navigate to="/seller/dashboard" replace />} />

                        <Route path="/seller/my-store" element={
                          <ProtectedRoute roles={["seller"]}>
                            <SellerRouteGuard>
                              <Navigate to="/seller/dashboard?tab=my-store" replace />
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
                        <Route path="/admin/categories" element={<ProtectedRoute roles={["admin"]}><Navigate to="/admin/dashboard?tab=categories" replace /></ProtectedRoute>} />
                        <Route path="/admin/categories/create" element={<ProtectedRoute roles={["admin"]}><CategoryCreate /></ProtectedRoute>} />
                        <Route path="/admin/categories/:id/edit" element={<ProtectedRoute roles={["admin"]}><CategoryEdit /></ProtectedRoute>} />
                        <Route path="/admin/products/:id/edit" element={<ProtectedRoute roles={["admin"]}><ProductEdit mode="admin" /></ProtectedRoute>} />
                          
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
                            <WithRC><ReportPage /></WithRC>
                          </React.Suspense>
                        } />

                        {/* ── My Reports ── */}
                        <Route path="/my-reports" element={
                          <ProtectedRoute>
                            <WithRC>
                            <React.Suspense fallback={<div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-green-500" /></div>}>
                              <MyReports />
                            </React.Suspense>
                            </WithRC>
                          </ProtectedRoute>
                        } />
                        <Route path="/my-reports/:ticket_id" element={
                          <ProtectedRoute>
                            <WithRC>
                            <React.Suspense fallback={null}>
                              <MyReports />
                            </React.Suspense>
                            </WithRC>
                          </ProtectedRoute>
                        } />

                        {/* Catch-all 404 — must be LAST */}
                        <Route path="*" element={<Error />} />
                      </Routes>
                      </Suspense>
                    </main>
                    <Footer />
                    <CookieBanner />
                    <FloatingCompareButton />
                  </div>
                  </ThemeProvider>
                  </CookieProvider>
                  </CompareProvider>
                </WishlistProvider>
                </Router>
              </CartProvider>
              </NotificationProvider>
              </SubscriptionProvider>
            </AuthProvider>
        </GoogleOAuthProvider>
      </I18nextProvider>
    </HelmetProvider>);
}

export default App;
