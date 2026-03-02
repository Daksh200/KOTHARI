/**
 * POS Invoice Builder Component
 * Main interface for creating and finalizing invoices
 * Features:
 * - Add/remove items
 * - Apply discounts
 * - Auto-calculate GST
 * - Process payments
 */

'use client';

import React, { useState, useEffect } from 'react';

interface InvoiceItem {
  id: string;
  productId: number;
  productName: string;
  unit: 'PIECE' | 'METER' | 'ROLL';
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  taxableAmount: number;
  tax: number;
  lineTotal: number;
}

interface Payment {
  mode: 'CASH' | 'CARD' | 'UPI' | 'BANK' | 'ADVANCE';
  amount: number;
  reference?: string;
}

export default function InvoiceBuilder() {
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [discount, setDiscount] = useState(0);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Calculate totals
  const subtotal = items.reduce((sum, item) => {
    const taxable = item.quantity * item.unitPrice - item.discount;
    return sum + taxable;
  }, 0);

  const totalTax = items.reduce((sum, item) => sum + item.tax, 0);
  const totalAmount = subtotal + totalTax + discount;
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const balance = totalAmount - totalPaid;

  // Add item to invoice
  const addItem = (product: any) => {
    const newItem: InvoiceItem = {
      id: Math.random().toString(),
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
    setItems([...items, newItem]);
  };

  // Update item quantity
  const updateItemQty = (id: string, qty: number) => {
    setItems(
      items.map((item) => {
        if (item.id !== id) return item;
        const taxable = qty * item.unitPrice - item.discount;
        const tax = (taxable * item.taxRate) / 100;
        return {
          ...item,
          quantity: qty,
          taxableAmount: taxable,
          tax,
          lineTotal: taxable + tax,
        };
      })
    );
  };

  // Remove item
  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  // Add payment
  const addPayment = (mode: Payment['mode'], amount: number, reference?: string) => {
    if (amount > 0) {
      setPayments([...payments, { mode, amount, reference }]);
    }
  };

  // Finalize invoice
  const finalizeInvoice = async () => {
    if (items.length === 0) {
      alert('Add items to invoice');
      return;
    }

    if (balance !== 0 && balance > 0.01) {
      alert(`Balance ₹${balance.toFixed(2)} remaining`);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/invoices/finalize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          // Adjust payload based on your finalize endpoint
          items,
          customerId,
          payments,
          discount,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to finalize invoice');
      }

      const result = await response.json();
      alert(`Invoice ${result.invoiceNumber} created successfully!`);

      // Reset form
      setItems([]);
      setPayments([]);
      setDiscount(0);
    } catch (error) {
      alert('Error finalizing invoice: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">POS Invoice Builder</h1>
          <button
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Back
          </button>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Items List - Main Area */}
          <div className="col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Invoice Items</h2>

              {items.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No items added. Search and add products.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-semibold">Product</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold">Qty</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold">Price</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold">Disc</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold">Tax</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold">Total</th>
                        <th className="px-4 py-2 text-center text-sm font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm">{item.productName}</td>
                          <td className="px-4 py-2 text-right">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItemQty(item.id, parseFloat(e.target.value))}
                              className="w-16 px-2 py-1 border rounded text-right"
                              min="0"
                              step={item.unit === 'METER' ? '0.1' : '1'}
                            />
                          </td>
                          <td className="px-4 py-2 text-right text-sm">₹{item.unitPrice.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right text-sm">₹{item.discount.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right text-sm">₹{item.tax.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right text-sm font-semibold">
                            ₹{item.lineTotal.toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <button
                              onClick={() => removeItem(item.id)}
                              className="text-red-600 hover:text-red-800 font-sm"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Summary & Payments */}
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Summary</h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Tax:</span>
                  <span>₹{totalTax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span>-₹{discount.toFixed(2)}</span>
                </div>

                <div className="border-t pt-2 mt-2 flex justify-between font-semibold text-base">
                  <span>Total:</span>
                  <span>₹{totalAmount.toFixed(2)}</span>
                </div>

                <div className="bg-blue-50 p-2 rounded">
                  <div className="flex justify-between text-blue-900">
                    <span>Paid:</span>
                    <span>₹{totalPaid.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-blue-900">
                    <span>Balance:</span>
                    <span className={balance > 0 ? 'text-red-600' : 'text-green-600'}>
                      ₹{balance.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payments */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Payments</h3>

              <div className="space-y-2 mb-4">
                {payments.map((p, idx) => (
                  <div key={idx} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                    <span>{p.mode}</span>
                    <span>₹{p.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {balance > 0 && (
                <button
                  onClick={() => setShowPaymentForm(!showPaymentForm)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
                >
                  Add Payment
                </button>
              )}

              {showPaymentForm && (
                <PaymentForm
                  maxAmount={balance}
                  onAdd={(mode, amount, ref) => {
                    addPayment(mode, amount, ref);
                    setShowPaymentForm(false);
                  }}
                />
              )}

              <button
                onClick={finalizeInvoice}
                disabled={loading || balance > 0.01}
                className="w-full mt-4 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Finalize Invoice'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Payment Form Component
 */
interface PaymentFormProps {
  maxAmount: number;
  onAdd: (mode: Payment['mode'], amount: number, reference?: string) => void;
}

function PaymentForm({ maxAmount, onAdd }: PaymentFormProps) {
  const [mode, setMode] = useState<Payment['mode']>('CASH');
  const [amount, setAmount] = useState(maxAmount);
  const [reference, setReference] = useState('');

  return (
    <div className="space-y-3 mt-3 p-3 bg-gray-50 rounded">
      <div>
        <label className="block text-sm font-medium mb-1">Mode</label>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as Payment['mode'])}
          className="w-full px-3 py-2 border rounded text-sm"
        >
          <option>CASH</option>
          <option>CARD</option>
          <option>UPI</option>
          <option>BANK</option>
          <option>ADVANCE</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Amount</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(parseFloat(e.target.value))}
          max={maxAmount}
          className="w-full px-3 py-2 border rounded text-sm"
        />
      </div>

      {(mode === 'UPI' || mode === 'CARD') && (
        <div>
          <label className="block text-sm font-medium mb-1">Reference ID</label>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className="w-full px-3 py-2 border rounded text-sm"
            placeholder="UPI ID / Card Ref"
          />
        </div>
      )}

      <button
        onClick={() => onAdd(mode, amount, reference)}
        className="w-full px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 font-medium"
      >
        Add
      </button>
    </div>
  );
}
