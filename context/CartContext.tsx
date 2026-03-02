'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { InvoiceItem } from '../components/CartPanel';
import { Payment } from '../components/PaymentPanel';

interface CartState {
  items: InvoiceItem[];
  customerId: number | null;
  customerName?: string;
  discount: number;
  payments: Payment[];
  addItem: (product: any) => void;
  updateQty: (id: string, qty: number) => void;
  updateTaxRate: (id: string, taxRate: number) => void;
  applyTaxRateToAll: (taxRate: number) => void;
  removeItem: (id: string) => void;
  setCustomer: (id: number, name?: string) => void;
  setDiscount: (d: number) => void;
  addPayment: (p: Payment) => void;
  removePayment: (index: number) => void;
  reset: () => void;
}

const CartContext = createContext<CartState | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<InvoiceItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem('cart_items') || '[]');
    } catch {
      return [];
    }
  });
  const [customerId, setCustomerId] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    const value = localStorage.getItem('cart_customer_id');
    return value ? Number(value) : null;
  });
  const [customerName, setCustomerName] = useState<string | undefined>(() => {
    if (typeof window === 'undefined') return undefined;
    return localStorage.getItem('cart_customer_name') || undefined;
  });
  const [discount, setDiscount] = useState(() => {
    if (typeof window === 'undefined') return 0;
    return Number(localStorage.getItem('cart_discount') || 0);
  });
  const [payments, setPayments] = useState<Payment[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem('cart_payments') || '[]');
    } catch {
      return [];
    }
  });

  const addItem = (product: any) => {
    const newItem: InvoiceItem = {
      id: String(Date.now()) + Math.random(),
      productId: product.id,
      productName: product.name,
      unit: product.unit,
      quantity: 1,
      unitPrice: product.basePrice,
      discount: 0,
      taxRate: product.taxRate?.percentage || 0,
      taxableAmount: product.basePrice,
      tax: (product.basePrice * (product.taxRate?.percentage || 0)) / 100,
      lineTotal: product.basePrice + (product.basePrice * (product.taxRate?.percentage || 0)) / 100,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const updateQty = (id: string, qty: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const taxable = qty * item.unitPrice - item.discount;
        const tax = (taxable * item.taxRate) / 100;
        return { ...item, quantity: qty, taxableAmount: taxable, tax, lineTotal: taxable + tax };
      })
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const setCustomer = (id: number, name?: string) => {
    setCustomerId(id);
    setCustomerName(name);
  };

  const addPayment = (p: Payment) => {
    setPayments((prev) => [...prev, p]);
  };

  const updateTaxRate = (id: string, taxRate: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const safeRate = Number.isFinite(taxRate) ? Math.max(0, taxRate) : 0;
        const taxable = item.quantity * item.unitPrice - item.discount;
        const tax = (taxable * safeRate) / 100;
        return { ...item, taxRate: safeRate, taxableAmount: taxable, tax, lineTotal: taxable + tax };
      })
    );
  };

  const applyTaxRateToAll = (taxRate: number) => {
    const safeRate = Number.isFinite(taxRate) ? Math.max(0, taxRate) : 0;
    setItems((prev) =>
      prev.map((item) => {
        const taxable = item.quantity * item.unitPrice - item.discount;
        const tax = (taxable * safeRate) / 100;
        return { ...item, taxRate: safeRate, taxableAmount: taxable, tax, lineTotal: taxable + tax };
      })
    );
  };

  const removePayment = (index: number) => {
    setPayments((prev) => prev.filter((_, i) => i !== index));
  };

  const reset = () => {
    setItems([]);
    setCustomerId(null);
    setCustomerName(undefined);
    setDiscount(0);
    setPayments([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cart_items');
      localStorage.removeItem('cart_customer_id');
      localStorage.removeItem('cart_customer_name');
      localStorage.removeItem('cart_discount');
      localStorage.removeItem('cart_payments');
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('cart_items', JSON.stringify(items));
    localStorage.setItem('cart_customer_id', customerId ? String(customerId) : '');
    localStorage.setItem('cart_customer_name', customerName || '');
    localStorage.setItem('cart_discount', String(discount));
    localStorage.setItem('cart_payments', JSON.stringify(payments));
  }, [items, customerId, customerName, discount, payments]);

  return (
    <CartContext.Provider
      value={{
        items,
        customerId,
        customerName,
        discount,
        payments,
        addItem,
        updateQty,
        updateTaxRate,
        applyTaxRateToAll,
        removeItem,
        setCustomer,
        setDiscount,
        addPayment,
        removePayment,
        reset,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
