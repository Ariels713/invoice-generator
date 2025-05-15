'use client'

import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer'
import { Invoice } from '@/types/invoice'
import { formatCurrency } from '@/lib/currencies'

// Register font
Font.register({
  family: 'Oswald',
  src: 'https://fonts.gstatic.com/s/oswald/v13/Y_TKV6o8WovbUd3m_X9aAA.ttf'
})

// Create styles
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 10,
    color: '#151716',
  },
  logo: {
    width: 100,
    height: 'auto',
    objectFit: 'contain',
  },
  invoiceDetails: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  invoiceDetailsText: {
    color: '#747C78',
    fontSize: 10,
    marginBottom: '2px'
  },
  companyInfo: {
    marginBottom: 15,
    flex: 1,
  },
  label: {
    fontSize: 10,
    marginBottom: 5,
    color: '#666666',
  },
  tableContainer: {
    marginBottom: 20,
    borderLeftWidth: 2,
    borderLeftStyle: 'solid',
    borderLeftColor: '#05a588',
    paddingLeft: 20
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  tableCell: {
    flex: 1,
  },
  tableCellHeaders: {
    fontSize: 10,
    marginBottom: 5,
    color: '#666666',
  },
  tableCellRight: {
    flex: 1,
    paddingHorizontal: 5,
    textAlign: 'right',
  },
  totals: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
    marginBottom: 5,
  },
  bold: {
    fontWeight: 'bold',
  },
  notes: {
    marginTop: 30,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  notesWrapper: {
    width: 300,
    marginLeft: 'auto'
  },
  notesContent: {
    marginTop: 10,
  },
  text: {
    fontSize: 10,
    color: '#151716',
  },
  textBold: {
    fontSize: 12,
    color: '#151716',
    fontWeight: 'bold',
  },
})

interface InvoicePDFProps {
  invoice: Invoice
}

export function InvoicePDF({ invoice }: InvoicePDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>INVOICE</Text>
          {invoice.logo && (
            <Image
              src={invoice.logo}
              style={styles.logo}
            />
          )}
        </View>

        {/* Invoice Details */}
        <View style={styles.invoiceDetails}>
          <View style={styles.companyInfo}>
            <Text style={[styles.label, styles.textBold]}>Total {formatCurrency(invoice.total, invoice.currency)}</Text>
            <Text style={[styles.text, styles.invoiceDetailsText]}>Due Date: {invoice.dueDate}</Text>
            <Text style={[styles.text, styles.invoiceDetailsText]}>Date: {invoice.date}</Text>
            {invoice.invoiceNumber && (
              <Text style={[styles.text, styles.invoiceDetailsText]}>Ref: {invoice.invoiceNumber}</Text>
            )}
          </View>
          
          <View style={styles.companyInfo}>
            <Text style={[styles.label, styles.textBold]}>From:</Text>
            <Text style={[styles.text, styles.invoiceDetailsText]}>{invoice.sender.name}</Text>
            <Text style={[styles.text, styles.invoiceDetailsText]}>{invoice.sender.address}</Text>
            {invoice.sender.address2 && (
              <Text style={[styles.text, styles.invoiceDetailsText]}>{invoice.sender.address2}</Text>
            )}
            <Text style={[styles.text, styles.invoiceDetailsText]}>{invoice.sender.city}, {invoice.sender.state} {invoice.sender.postalCode}</Text>
            <Text style={[styles.text, styles.invoiceDetailsText]}>{invoice.sender.country}</Text>
            <Text style={[styles.text, styles.invoiceDetailsText]}>{invoice.sender.email}</Text>
            <Text style={[styles.text, styles.invoiceDetailsText]}>{invoice.sender.phone}</Text>
          </View>

          <View style={styles.companyInfo}>
            <Text style={[styles.label, styles.textBold]}>To:</Text>
            <Text style={[styles.text, styles.invoiceDetailsText]}>{invoice.recipient.name}</Text>
            <Text style={[styles.text, styles.invoiceDetailsText]}>{invoice.recipient.address}</Text>
            {invoice.recipient.address2 && (
              <Text style={[styles.text, styles.invoiceDetailsText]}>{invoice.recipient.address2}</Text>
            )}
            <Text style={[styles.text, styles.invoiceDetailsText]}>{invoice.recipient.city}, {invoice.recipient.state} {invoice.recipient.postalCode}</Text>
            <Text style={[styles.text, styles.invoiceDetailsText]}>{invoice.recipient.country}</Text>
            <Text style={[styles.text, styles.invoiceDetailsText]}>{invoice.recipient.email}</Text>
            <Text style={[styles.text, styles.invoiceDetailsText]}>{invoice.recipient.phone}</Text>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.tableContainer}>
          <View style={styles.companyInfo}>
            {invoice.invoiceNumber && (
              <Text style={[styles.label, styles.textBold]}>Invoice #{invoice.invoiceNumber}</Text>
            )}
          </View>
          
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.tableCellHeaders]}>ITEM</Text>
            <Text style={[styles.tableCellRight, styles.tableCellHeaders]}>PERIOD</Text>
            <Text style={[styles.tableCellRight, styles.tableCellHeaders]}>QTY</Text>
            <Text style={[styles.tableCellRight, styles.tableCellHeaders]}>RATE</Text>
            <Text style={[styles.tableCellRight, styles.tableCellHeaders]}>AMOUNT</Text>
          </View>
          
          {invoice.items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.text, styles.bold]}>{item.description}</Text>
              <Text style={[styles.tableCellRight, styles.text]}>{item.issueDate}</Text>
              <Text style={[styles.tableCellRight, styles.text]}>{item.quantity}</Text>
              <Text style={[styles.tableCellRight, styles.text]}>{formatCurrency(item.rate, invoice.currency)}</Text>
              <Text style={[styles.tableCellRight, styles.text]}>{formatCurrency(item.amount, invoice.currency)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.text}>Subtotal:</Text>
            <Text style={styles.text}>{formatCurrency(invoice.subtotal, invoice.currency)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.text}>Tax ({invoice.taxRate}%):</Text>
            <Text style={styles.text}>{formatCurrency(invoice.taxAmount, invoice.currency)}</Text>
          </View>
          {invoice.shipping && invoice.shipping > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.text}>Shipping:</Text>
              <Text style={styles.text}>{formatCurrency(invoice.shipping, invoice.currency)}</Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.textBold}>Total:</Text>
            <Text style={styles.textBold}>{formatCurrency(invoice.total, invoice.currency)}</Text>
          </View>
        </View>

        {/* Notes and Payment Instructions */}
        {(invoice.notes || invoice.paymentInstructions) && (
          <View style={styles.notes}>
            <View style={styles.notesWrapper}>
              {invoice.paymentInstructions && (
                <View>
                  <Text style={styles.label}>PAYMENT DETAILS</Text>
                  <Text style={styles.text}>{invoice.paymentInstructions}</Text>
                </View>
              )}
              {invoice.notes && (
                <View style={styles.notesContent}>
                  <Text style={styles.label}>NOTES:</Text>
                  <Text style={styles.text}>{invoice.notes}</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </Page>
    </Document>
  )
} 