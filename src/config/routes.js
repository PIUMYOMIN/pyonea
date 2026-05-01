const routes = {
  development: {
    baseUrl: 'http://localhost:5173',
    apiBaseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
  },
  production: {
    baseUrl: 'https://pyonea.com',
    apiBaseUrl: 'https://api.pyonea.com/api/v1'
  }
};

export const getRoutesConfig = () => {
  const env = import.meta.env.MODE || 'development';
  return routes[env];
};

// Common route paths
export const ROUTE_PATHS = {
  RFQ: '/rfq',
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  BUYER_DASHBOARD: '/buyer/dashboard',
  SELLER_DASHBOARD: '/seller/dashboard',
  ADMIN_DASHBOARD: '/admin/dashboard',
  PRODUCTS: '/products',
  CART: '/cart'
};
