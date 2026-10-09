import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { cartService } from '../services/cartService';
import { wishlistService } from '../services/wishlistService';
import { toast, errMsg } from '../components/Toast';

const CartContext = createContext(null);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};

const EMPTY_CART = { items: [], subtotal: 0, availableCount: 0, unavailableCount: 0 };

// Holds the logged-in user's cart + wishlist and keeps them in sync with the API.
export const CartProvider = ({ children }) => {
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const [cart, setCart] = useState(EMPTY_CART);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Shoppers only: customers and artisans (admins get 403 from the API).
  const isShopper = isAuthenticated && user?.role !== 'ADMIN';

  // Load cart + wishlist when a shopper logs in; clear everything on logout.
  useEffect(() => {
    if (authLoading) return;
    if (!isShopper) {
      setCart(EMPTY_CART);
      setWishlist([]);
      setLoadError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    Promise.all([cartService.get(), wishlistService.get()])
      .then(([cartRes, wishRes]) => {
        if (cancelled) return;
        setCart(cartRes.data);
        setWishlist(wishRes.data.items || []);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(errMsg(err, 'Failed to load your cart'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [isShopper, authLoading, reloadKey]);

  // Manual retry for pages when the initial load failed.
  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  const addToCart = async (productId, quantity = 1) => {
    try {
      const res = await cartService.add(productId, quantity);
      setCart(res.data);
      toast.success('Added to cart');
      return true;
    } catch (err) {
      toast.error(errMsg(err, 'Could not add to cart'));
      return false;
    }
  };

  const updateQuantity = async (productId, quantity) => {
    try {
      const res = await cartService.updateQuantity(productId, quantity);
      setCart(res.data);
      return true;
    } catch (err) {
      // Example: "Insufficient stock for ...: only 2 available"
      toast.error(errMsg(err, 'Could not update quantity'));
      return false;
    }
  };

  const removeFromCart = async (productId) => {
    try {
      const res = await cartService.remove(productId);
      setCart(res.data);
      toast.success('Removed from cart');
      return true;
    } catch (err) {
      toast.error(errMsg(err, 'Could not remove from cart'));
      return false;
    }
  };

  const clearCart = async () => {
    try {
      const res = await cartService.clear();
      setCart(res.data);
      toast.success('Cart cleared');
      return true;
    } catch (err) {
      toast.error(errMsg(err, 'Could not clear cart'));
      return false;
    }
  };

  const toggleWishlist = async (productId) => {
    const inWishlist = isInWishlist(productId);
    try {
      const res = inWishlist
        ? await wishlistService.remove(productId)
        : await wishlistService.add(productId);
      setWishlist(res.data.items || []);
      toast.success(inWishlist ? 'Removed from wishlist' : 'Added to wishlist');
      return true;
    } catch (err) {
      toast.error(errMsg(err, 'Could not update wishlist'));
      return false;
    }
  };

  const moveToCart = async (productId) => {
    try {
      const res = await wishlistService.moveToCart(productId);
      setCart(res.data.cart);
      setWishlist(res.data.wishlist?.items || []);
      toast.success('Moved to cart');
      return true;
    } catch (err) {
      toast.error(errMsg(err, 'Could not move to cart'));
      return false;
    }
  };

  const isInWishlist = (productId) =>
    wishlist.some((product) => String(product._id) === String(productId));

  // Live badge count = total units in the cart.
  const cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  const value = {
    cart,
    cartCount,
    subtotal: cart.subtotal, // server-computed, never trusted from the client
    loading,
    loadError,
    reload,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    wishlist,
    isInWishlist,
    toggleWishlist,
    moveToCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
