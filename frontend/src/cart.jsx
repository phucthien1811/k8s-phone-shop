import { createContext, useContext, useEffect, useState } from 'react';

// Giỏ hàng lưu ở trình duyệt (localStorage), KHÔNG lưu trong Pod backend.
// Nhờ vậy backend "phi trạng thái": Pod nào bị xóa hay thêm mới thì giỏ hàng vẫn còn.
const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cart') || '[]'); } catch { return []; }
  });

  useEffect(() => {
    try { localStorage.setItem('cart', JSON.stringify(items)); } catch { /* bỏ qua */ }
  }, [items]);

  const add = (product, quantity = 1) =>
    setItems((cur) => {
      const found = cur.find((i) => i.id === product.id);
      if (found) return cur.map((i) => (i.id === product.id ? { ...i, quantity: i.quantity + quantity } : i));
      return [...cur, {
        id: product.id, name: product.name, brand: product.brand, color: product.color,
        price: product.sale_price ?? product.price, quantity,
      }];
    });
  const setQty = (id, quantity) => setItems((cur) => cur.map((i) => (i.id === id ? { ...i, quantity } : i)));
  const remove = (id) => setItems((cur) => cur.filter((i) => i.id !== id));
  const clear = () => setItems([]);
  const count = items.reduce((s, i) => s + i.quantity, 0);
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, add, setQty, remove, clear, count, total }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
