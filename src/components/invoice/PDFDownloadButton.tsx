'use client'

import { PDFDownloadLink } from '@react-pdf/renderer'
import { useEffect, useState } from 'react';
import { Invoice } from '@/types/invoice'
import { InvoicePDF } from './InvoicePDF'
import styles from './invoice-form.module.css'

interface PDFDownloadButtonProps {
  invoice: Invoice
  invoiceNumber: string
}

export function PDFDownloadButton({ invoice, invoiceNumber }: PDFDownloadButtonProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  return (
    <PDFDownloadLink
      document={<InvoicePDF invoice={invoice} />}
      fileName={`invoice-${invoiceNumber || 'preview'}.pdf`}
    >
      {({ loading }) => (
        <button
          type="button"
          className={styles.button}
          style={{ flex: 1 }}
          disabled={loading}
        >
          {loading ? 'Generating PDF...' : 'Download as PDF'}
        </button>
      )}
    </PDFDownloadLink>
  );
}