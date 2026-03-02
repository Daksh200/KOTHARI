// small helpers for invoice printing/export from the frontend
export async function downloadInvoicePDF(invoiceId: number | string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(`/api/invoices/${invoiceId}/pdf`, { headers: { Authorization: token ? `Bearer ${token}` : '' } });
  if (!res.ok) throw new Error('Failed to fetch PDF');
  const blob = await res.blob();
  return blob;
}

export async function triggerServerPrint(invoiceId: number | string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(`/api/invoices/${invoiceId}/print`, { method: 'POST', headers: { Authorization: token ? `Bearer ${token}` : '' } });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || 'Print failed');
  }
  return true;
}
