'use client';

import React from 'react';

export interface InvoiceItem {
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

interface CartPanelProps {
  items: InvoiceItem[];
  onQtyChange: (id: string, qty: number) => void;
  onTaxRateChange: (id: string, taxRate: number) => void;
  onRemove: (id: string) => void;
}

export default function CartPanel({
  items,
  onQtyChange,
  onTaxRateChange,
  onRemove,
}: CartPanelProps) {
  return (
    <div className="h-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Invoice Items</h2>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
          {items.length} line(s)
        </span>
      </div>

      {items.length === 0 ? (
        <p className="flex flex-1 items-center justify-center text-slate-500">
          No items added yet. Search and add product to start bill.
        </p>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="hidden md:block">
            <table className="w-full min-w-[1050px] text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-2 py-2 text-left">#</th>
                  <th className="px-2 py-2 text-left">Item Description</th>
                  <th className="px-2 py-2 text-right">Qty</th>
                  <th className="px-2 py-2 text-right">Rate</th>
                  <th className="px-2 py-2 text-right">Taxable</th>
                  <th className="px-2 py-2 text-right">GST %</th>
                  <th className="px-2 py-2 text-right">Tax</th>
                  <th className="px-2 py-2 text-right">Amount</th>
                  <th className="px-2 py-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.id} className="border-t border-slate-200">
                    <td className="px-2 py-2 text-slate-600">{idx + 1}</td>
                    <td className="px-2 py-2">
                      <div className="font-medium text-slate-900">{item.productName}</div>
                      <div className="text-xs text-slate-500">Unit: {item.unit}</div>
                    </td>
                    <td className="px-2 py-2 text-right">
                      <input
                        type="number"
                        value={item.quantity}
                        min={0}
                        step={item.unit === 'METER' ? 0.1 : 1}
                        onChange={(e) =>
                          onQtyChange(item.id, parseFloat(e.target.value || '0'))
                        }
                        className="w-20 rounded-md border border-slate-300 px-2 py-1 text-right"
                      />
                    </td>
                    <td className="px-2 py-2 text-right">Rs {item.unitPrice.toFixed(2)}</td>
                    <td className="px-2 py-2 text-right">Rs {item.taxableAmount.toFixed(2)}</td>
                    <td className="px-2 py-2 text-right">
                      <input
                        type="number"
                        value={item.taxRate}
                        min={0}
                        step={0.01}
                        onChange={(e) =>
                          onTaxRateChange(item.id, parseFloat(e.target.value || '0'))
                        }
                        className="w-20 rounded-md border border-slate-300 px-2 py-1 text-right"
                      />
                    </td>
                    <td className="px-2 py-2 text-right">Rs {item.tax.toFixed(2)}</td>
                    <td className="px-2 py-2 text-right font-semibold text-slate-900">
                      Rs {item.lineTotal.toFixed(2)}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        onClick={() => onRemove(item.id)}
                        className="rounded-md bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-2 md:hidden">
            {items.map((item, idx) => (
              <div key={item.id} className="rounded-lg border border-slate-200 p-3">
                <div className="mb-1 text-xs text-slate-500">Line {idx + 1}</div>
                <div className="font-semibold text-slate-900">{item.productName}</div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <label>
                    Qty
                    <input
                      type="number"
                      value={item.quantity}
                      min={0}
                      step={item.unit === 'METER' ? 0.1 : 1}
                      onChange={(e) => onQtyChange(item.id, parseFloat(e.target.value || '0'))}
                      className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
                    />
                  </label>
                  <label>
                    GST %
                    <input
                      type="number"
                      value={item.taxRate}
                      min={0}
                      step={0.01}
                      onChange={(e) =>
                        onTaxRateChange(item.id, parseFloat(e.target.value || '0'))
                      }
                      className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
                    />
                  </label>
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  Amount: <span className="font-semibold text-slate-900">Rs {item.lineTotal.toFixed(2)}</span>
                </div>
                <button
                  onClick={() => onRemove(item.id)}
                  className="mt-2 rounded bg-red-50 px-2 py-1 text-xs text-red-700"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
