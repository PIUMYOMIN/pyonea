import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from './AuthContext';

const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
  const [wishlist, setWishlist] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchWishlist();
    } else {
      setWishlist([]);
    }
  }, [user]);

  const fetchWishlist = async () => {
    try {
      const res = await api.get('/wishlist');
      setWishlist(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch wishlist', err);
    }
  };

  const addToWishlist = async (productId) => {
    const previous = wishlist;
    setWishlist(prev => prev.some(item => item.id === productId || item.product_id === productId) ? prev : [{ id: productId, product_id: productId }, ...prev]);
    try {
      await api.post('/wishlist', { product_id: productId });
      await fetchWishlist();
    } catch (error) {
      setWishlist(previous);
      throw error;
    }
  };

  const removeFromWishlist = async (productId) => {
    const previous = wishlist;
    setWishlist(prev => prev.filter(item => item.id !== productId && item.product_id !== productId));
    try {
      await api.delete(`/wishlist/${productId}`);
      await fetchWishlist();
    } catch (error) {
      setWishlist(previous);
      throw error;
    }
  };

  return (
    <WishlistContext.Provider value={{ wishlist, addToWishlist, removeFromWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
