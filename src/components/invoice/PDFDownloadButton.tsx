'use client'

import { useState } from 'react'
import { Invoice } from '@/types/invoice'
import { InvoicePDF } from './InvoicePDF'
import styles from './invoice-form.module.css'
import { pdf } from '@react-pdf/renderer'

interface PDFDownloadButtonProps {
  invoice: Invoice
  invoiceNumber?: string
  onDownload?: () => Promise<void>
}

export function PDFDownloadButton({ invoice, invoiceNumber, onDownload }: PDFDownloadButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const handleDownload = async () => {
    if (onDownload) {
      await onDownload()
    }
    setIsGenerating(true)
    setError(null)
    
    try {
      // Generate the PDF blob
      const blob = await pdf(<InvoicePDF invoice={invoice} />).toBlob()
      
      // Create a URL for the blob
      const url = URL.createObjectURL(blob)
      
      // Create a temporary link element
      const link = document.createElement('a')
      link.href = url
      link.download = `invoice-${invoiceNumber || 'preview'}.pdf`
      
      // Append to the document, click it, and remove it
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Clean up the blob URL
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error generating PDF:', err)
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setIsGenerating(false)
    }
  }
  
  return (
    <button
      type="button"
      className={styles.button}
      style={{ flex: 1 }}
      onClick={handleDownload}
      disabled={isGenerating}
    >
      {isGenerating ? 'Generating PDF...' : error ? 'Error generating PDF' : 'Download as PDF'}
    </button>
  )
}