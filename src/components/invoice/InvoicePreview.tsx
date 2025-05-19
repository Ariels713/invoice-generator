"use client";

import { useRef, useState } from "react";
import { Invoice } from "@/types/invoice";
import { formatCurrency } from "@/lib/currencies";
import styles from "./invoice-preview.module.css";
import Image from 'next/image'
import { AnimatePresence, motion, LayoutGroup } from "motion/react";

interface InvoicePreviewProps {
  invoice: Invoice;
}

function formatPeriodDate(dateString: string): string {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  
  const month = date.toLocaleString('default', { month: 'long' });
  const year = date.getFullYear().toString().slice(-2);
  return `${month} '${year}`;
}

export function InvoicePreview({ invoice }: InvoicePreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [themeColor, setThemeColor] = useState('#05a588'); // Default theme color
  
  // Define a consistent transition for both directions - less bouncy
  const smoothTransition = { 
    type: "spring", 
    stiffness: 250, 
    damping: 30,
    mass: 1
  };

  const handleThemeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setThemeColor(e.target.value);
  };

  // Invoice content component - reused in both preview and expanded view
  const InvoiceContent = () => (
    <>
      <div className={styles.header}>
        <h2 className={styles.title}>Invoice</h2>
        {invoice.logo && (
          <Image
            src={invoice.logo}
            alt="Company Logo"
            className={styles.logo}
            width={150}
            height={150}
            style={{ objectFit: 'contain' }}
          />
        )}
      </div>

      <div className={styles.invoiceDetails}>
        <div>
          <p className={styles.invoiceDetailsHeader}>
            Payable {formatCurrency(invoice.total, invoice.currency)}
          </p>
          <p className={styles.invoiceDetailsSubHeader}>
            Due: {invoice.dueDate}
          </p>
          <p>Issued: {invoice.date}</p>
          <p>Ref: {invoice.invoiceNumber}</p>
        </div>
        <div className={styles.companyInfo}>
          <p className={styles.invoiceDetailsHeader}>From:</p>
          <p className={styles.invoiceDetailsSubHeader}>{invoice.sender.name}</p>
          <p>{invoice.sender.address}</p>
          <p>
            {invoice.sender.city ? `${invoice.sender.city},` : ''} {invoice.sender.state} {invoice.sender.postalCode}
          </p>
          <p>{invoice.sender.phone}</p>
        </div>
        <div className={styles.companyInfo}>
          <p className={styles.invoiceDetailsHeader}>To:</p>
          <p className={styles.invoiceDetailsSubHeader}>{invoice.recipient.name}</p>
          <p>{invoice.recipient.address}</p>
          <p>
            {invoice.recipient.city ? `${invoice.recipient.city},` : ''} {invoice.recipient.state} {invoice.recipient.postalCode}
          </p>
          <p>{invoice.recipient.phone}</p>
        </div>
      </div>

      <div className={styles.invoiceNameContainer}>
        {invoice.invoiceName && (
          <p className={styles.invoiceName}>{invoice.invoiceName}</p>
        )}
      </div>

      <div className={styles.tableContainer} style={{ ["--user-theme-color" as string]: themeColor }}>
        <table className={styles.table}> 
          <thead>
            <tr>
              <th>Item</th>
              <th style={{ textAlign: "right" }}>Period</th>
              <th style={{ textAlign: "right" }}>QTY</th>
              <th style={{ textAlign: "right" }}>RATE</th>
              <th style={{ textAlign: "right" }}>AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, index) => (
              <tr key={index}>
                <td style={{ fontWeight: 600 }}>{item.description}</td>
                <td style={{ textAlign: "right" }}>{formatPeriodDate(item.issueDate)}</td>
                <td style={{ textAlign: "right" }}>{item.quantity}</td>
                <td style={{ textAlign: "right" }}>
                  {formatCurrency(item.rate, invoice.currency)}
                </td>
                <td style={{ textAlign: "right" }}>
                  {formatCurrency(item.amount, invoice.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.totals}>
        <div className={styles.totalRow}>
          <span>Subtotal:</span>
          <span>{formatCurrency(invoice.subtotal, invoice.currency)}</span>
        </div>
        <div className={styles.totalRow}>
          <span>Tax ({invoice.taxRate}%):</span>
          <span>{formatCurrency(invoice.taxAmount, invoice.currency)}</span>
        </div>
        {(invoice.shipping !== undefined && invoice.shipping !== null && invoice.shipping > 0) && (
          <div className={styles.totalRow}>
            <span>Shipping:</span>
            <span>{formatCurrency(invoice.shipping, invoice.currency)}</span>
          </div>
        )}
        <div className={styles.totalDivider} />
        <div className={`${styles.totalRow} ${styles.bold}`}>
          <span>Total:</span>
          <span>{formatCurrency(invoice.total, invoice.currency)}</span>
        </div>
      </div>

      {(invoice.notes || invoice.paymentInstructions) && (
        <div className={styles.notes}>
          {invoice.notes && (
            <div style={{ marginBottom: 16 }}>
              <h3 className={styles.label}>Notes:</h3>
              <p>{invoice.notes}</p>
            </div>
          )}
          {invoice.paymentInstructions && (
            <div>
              <h3 className={styles.label}>Payment Instructions:</h3>
              <p>{invoice.paymentInstructions}</p>
            </div>
          )}
        </div>
      )}
    </>
  );

  return (
    <div className={styles.previewWrapper}>
      <LayoutGroup id="invoice-animation">
        {/* Only show the preview when not expanded */}
        {!isExpanded && (
          <motion.div 
            ref={previewRef} 
            className={styles.previewContainer}
            layoutId="invoice-preview-container"
            onClick={() => setIsExpanded(true)}
            transition={smoothTransition}
            style={{ 
              transformOrigin: "top left",
              aspectRatio: "9/11"
              // scale: 0.55
            }}
          >
            <InvoiceContent />
          </motion.div>
        )}

        {/* Expanded preview modal */}
        <AnimatePresence>
          {isExpanded && (
            <>
              <motion.div 
                className={styles.overlay}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsExpanded(false)}
                transition={{ duration: 0.2 }}
              />
              <div className={styles.expandedPreviewWrapper}>
                <motion.div 
                  className={styles.expandedPreview}
                  layoutId="invoice-preview-container"
                  transition={smoothTransition}
                  style={{ 
                    transformOrigin: "top left",
                    width: "8.5in", // Standard letter width
                    maxWidth: "90vw", // Responsive constraint
                    aspectRatio: "9/11"
                  }}
                >
                  <button 
                    className={styles.closeButton}
                    onClick={() => setIsExpanded(false)}
                  >
                    ×
                  </button>
                  <InvoiceContent />
                  <input
                    type="color"
                    value={themeColor}
                    onChange={handleThemeChange}
                    className={styles.colorPicker}
                    title="Choose theme color"
                  />
                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>
      </LayoutGroup>
      
      {!isExpanded && (
        <div className={styles.previewHeader}>
          <button 
            className={styles.previewButton} 
            onClick={() => setIsExpanded(true)}
          >
            Preview Invoice
          </button>
        </div>
      )}
    </div>
  );
}
