'use client'

import { PDFDownloadLink } from '@react-pdf/renderer'
import { useState } from 'react'
import { Invoice } from '@/types/invoice'
import { InvoicePDF } from './InvoicePDF'
import styles from './invoice-form.module.css'

interface PDFDownloadButtonProps {
  invoice: Invoice
  invoiceNumber: string
}

export function PDFDownloadButton({ invoice, invoiceNumber }: PDFDownloadButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleDownload = () => {
    setIsGenerating(true)
  }

  if (!isGenerating) {
    return (
      <button
        type="button"
        className={styles.button}
        style={{ flex: 1 }}
        onClick={handleDownload}
      >
        Download as PDF
      </button>
    )
  }

  return (
    <PDFDownloadLink
      document={<InvoicePDF invoice={invoice} />}
      fileName={`invoice-${invoiceNumber || 'preview'}.pdf`}
    >
      {({ loading, error }) => (
        <button
          type="button"
          className={styles.button}
          style={{ flex: 1 }}
          disabled={loading}
        >
          {loading ? 'Generating PDF...' : error ? 'Error generating PDF' : 'Download as PDF'}
        </button>
      )}
    </PDFDownloadLink>
  )
}