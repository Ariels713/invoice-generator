"use client";

import { useRef, useState } from "react";
import { Invoice } from "@/types/invoice";
import { formatCurrency } from "@/lib/currencies";
import styles from "./invoice-preview.module.css";
import Image from "next/image";
import { AnimatePresence, motion, LayoutGroup } from "motion/react";

interface InvoicePreviewProps {
  invoice: Invoice;
}

function formatPeriodDate(dateString: string): string {
  if (!dateString) return "";

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";

  const month = date.toLocaleString("default", { month: "long" });
  const year = date.getFullYear().toString().slice(-2);
  return `${month} '${year}`;
}

export function InvoicePreview({ invoice }: InvoicePreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [themeColor, setThemeColor] = useState("#05a588"); // Default theme color

  // Define a consistent transition for both directions - less bouncy
  const smoothTransition = {
    type: "spring",
    stiffness: 250,
    damping: 30,
    mass: 1,
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
            style={{ objectFit: "contain" }}
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
          <p className={styles.invoiceDetailsSubHeader}>
            {invoice.sender.name}
          </p>
          <p>{invoice.sender.address}</p>
          <p>
            {invoice.sender.city ? `${invoice.sender.city},` : ""}{" "}
            {invoice.sender.state} {invoice.sender.postalCode}
          </p>
          <p>{invoice.sender.phone}</p>
        </div>
        <div className={styles.companyInfo}>
          <p className={styles.invoiceDetailsHeader}>To:</p>
          <p className={styles.invoiceDetailsSubHeader}>
            {invoice.recipient.name}
          </p>
          <p>{invoice.recipient.address}</p>
          <p>
            {invoice.recipient.city ? `${invoice.recipient.city},` : ""}{" "}
            {invoice.recipient.state} {invoice.recipient.postalCode}
          </p>
          <p>{invoice.recipient.phone}</p>
        </div>
      </div>

      <div className={styles.invoiceNameContainer}>
        {invoice.invoiceName && (
          <p data-truncate-length="250" className={`${styles.invoiceName}`}>
            {invoice.invoiceName}
          </p>
        )}
      </div>

      <div
        className={styles.tableContainer}
        style={{ ["--user-theme-color" as string]: themeColor }}
      >
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
                <td className={styles.itemDescription}>{item.description}</td>
                <td style={{ textAlign: "right" }}>
                  {formatPeriodDate(item.issueDate)}
                </td>
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
        {invoice.shipping !== undefined &&
          invoice.shipping !== null &&
          invoice.shipping > 0 && (
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
              aspectRatio: "9/11",
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
                    width: "7.5in", // Standard letter width
                    maxWidth: "90vw", // Responsive constraint
                    aspectRatio: "9/11",
                  }}
                >
                  <button
                    className={styles.closeButton}
                    onClick={() => setIsExpanded(false)}
                  >
                    ×
                  </button>
                  <InvoiceContent />
                  <div className={styles.pile}>
                    <input
                      type="color"
                      value={themeColor}
                      onChange={handleThemeChange}
                      className={styles.colorPicker}
                      title="Choose theme color"
                    />
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 100 100"
                      className={styles.colorPickerIcon}
                    >
                      <path d="M 89.663 20.266 C 89.562 17.766 88.561 15.465 86.663 13.766 C 83.061 10.567 77.464 10.766 73.862 14.367 L 62.663 25.664 L 60.061 23.063 C 59.261 22.262 58.061 22.262 57.261 23.063 C 56.46 23.864 56.46 25.063 57.261 25.864 L 59.862 28.465 L 25.663 62.567 C 22.663 65.567 20.265 69.368 18.862 73.368 L 14.362 77.868 C 12.062 80.169 11.761 83.97 13.761 86.368 C 14.863 87.767 16.562 88.567 18.261 88.669 L 18.562 88.669 C 20.163 88.669 21.761 87.97 22.96 86.868 L 27.659 82.169 C 31.659 80.771 35.46 78.368 38.46 75.368 L 72.663 41.266 L 75.265 43.868 C 75.663 44.266 76.163 44.469 76.663 44.469 C 77.163 44.469 77.663 44.27 78.062 43.868 C 78.862 43.067 78.862 41.868 78.062 41.067 L 75.46 38.465 L 87.062 26.863 C 88.761 25.164 89.761 22.664 89.664 20.266 L 89.663 20.266 Z M 35.663 72.567 C 32.964 75.266 29.561 77.368 25.964 78.567 C 25.663 78.668 25.362 78.868 25.163 79.067 L 20.163 84.067 C 19.663 84.567 19.061 84.766 18.464 84.766 C 17.862 84.766 17.265 84.465 16.862 83.965 C 16.163 83.067 16.261 81.664 17.163 80.766 L 21.964 75.965 C 22.163 75.766 22.362 75.465 22.464 75.164 C 23.663 71.563 25.765 68.164 28.464 65.465 L 62.663 31.266 L 69.862 38.465 L 35.663 72.567 Z" />
                    </svg>
                  </div>
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
