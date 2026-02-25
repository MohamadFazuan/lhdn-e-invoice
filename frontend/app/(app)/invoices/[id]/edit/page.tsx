'use client';

import { use } from 'react';
import { InvoiceForm } from '@/components/invoices/invoice-form';

export default function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <InvoiceForm mode="edit" invoiceId={id} />;
}
