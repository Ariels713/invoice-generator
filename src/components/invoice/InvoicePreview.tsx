"use client";

import { useRef } from "react";
import { Invoice } from "@/types/invoice";
import { formatCurrency } from "@/lib/currencies";
import styles from "./invoice-preview.module.css";
import Image from 'next/image'

interface InvoicePreviewProps {
  invoice: Invoice;
}

function formatPeriodDate(dateString: string): string {
  if (!dateString) return ''; // Return empty string if no date is provided
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return ''; // Return empty string if date is invalid
  
  const month = date.toLocaleString('default', { month: 'long' });
  const year = date.getFullYear().toString().slice(-2);
  return `${month} '${year}`;
}

export function InvoicePreview({ invoice }: InvoicePreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null);

  // Download PDF logic will be handled in the parent form

  return (
    <div className={styles.previewWrapper}>
      <p className={styles.previewCopy}>Preview</p>
      <div ref={previewRef} className={styles.previewContainer}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>INVOICE</h1>
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
          {/* {invoice.invoiceName && (
              <p className={styles.invoiceName}>{invoice.invoiceName}</p>
            )} */}
        </div>

        {/* Invoice Number */}
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
            <h2 className={styles.invoiceDetailsHeader}>From:</h2>
            <p>{invoice.sender.name}</p>
            <p>{invoice.sender.address}</p>
            <p>
              {invoice.sender.city}, {invoice.sender.state}{" "}
              {invoice.sender.zipCode}
            </p>
            <p>{invoice.sender.country}</p>
            <p>{invoice.sender.email}</p>
            <p>{invoice.sender.phone}</p>
          </div>
          <div className={styles.companyInfo}>
            <h2 className={styles.invoiceDetailsHeader}>To:</h2>
            <p>{invoice.recipient.name}</p>
            <p>{invoice.recipient.address}</p>
            <p>
              {invoice.recipient.city}, {invoice.recipient.state}{" "}
              {invoice.recipient.zipCode}
            </p>
            <p>{invoice.recipient.country}</p>
            <p>{invoice.recipient.email}</p>
            <p>{invoice.recipient.phone}</p>
          </div>
        </div>

        {/* Company Information */}
        {/* Table Name / */}
        <div className={styles.invoiceNameContainer}>
          {invoice.invoiceName && (
            <p className={styles.invoiceName}>{invoice.invoiceName}</p>
          )}
        </div>
        {/* Items Table */}
        <div className={styles.tableContainer}>
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
        {/* Totals */}
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

        {/* Notes and Payment Instructions */}
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
      </div>
    </div>
  );
}
