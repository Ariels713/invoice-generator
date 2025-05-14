'use client'

import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { Invoice } from '@/types/invoice'
import { formatCurrency } from '@/lib/currencies'

// Register fonts if needed
// Font.register({
//   family: 'Your Font',
//   src: '/path/to/font.ttf'
// })

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
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  companyInfo: {
    marginBottom: 15,
    width: '30%',
  },
  label: {
    fontSize: 12,
    marginBottom: 5,
    color: '#666666',
  },
  tableContainer: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f4f8f6',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    borderBottomStyle: 'solid',
    paddingVertical: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    borderBottomStyle: 'solid',
    paddingVertical: 8,
  },
  tableCell: {
    flex: 1,
    paddingHorizontal: 5,
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
  notesContent: {
    marginBottom: 10,
  },
  text: {
    fontSize: 12,
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
            <Text style={styles.label}>Invoice #{invoice.invoiceNumber}</Text>
            <Text style={styles.text}>Date: {invoice.date}</Text>
            <Text style={styles.text}>Due Date: {invoice.dueDate}</Text>
          </View>
          
          <View style={styles.companyInfo}>
            <Text style={styles.label}>From:</Text>
            <Text style={styles.text}>{invoice.sender.name}</Text>
            <Text style={styles.text}>{invoice.sender.address}</Text>
            <Text style={styles.text}>{invoice.sender.city}, {invoice.sender.state} {invoice.sender.postalCode}</Text>
            <Text style={styles.text}>{invoice.sender.country}</Text>
            <Text style={styles.text}>{invoice.sender.email}</Text>
            <Text style={styles.text}>{invoice.sender.phone}</Text>
          </View>

          <View style={styles.companyInfo}>
            <Text style={styles.label}>To:</Text>
            <Text style={styles.text}>{invoice.recipient.name}</Text>
            <Text style={styles.text}>{invoice.recipient.address}</Text>
            <Text style={styles.text}>{invoice.recipient.city}, {invoice.recipient.state} {invoice.recipient.postalCode}</Text>
            <Text style={styles.text}>{invoice.recipient.country}</Text>
            <Text style={styles.text}>{invoice.recipient.email}</Text>
            <Text style={styles.text}>{invoice.recipient.phone}</Text>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.textBold]}>Description</Text>
            <Text style={[styles.tableCellRight, styles.textBold]}>Quantity</Text>
            <Text style={[styles.tableCellRight, styles.textBold]}>Rate</Text>
            <Text style={[styles.tableCellRight, styles.textBold]}>Amount</Text>
          </View>
          
          {invoice.items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.text]}>{item.description}</Text>
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
            {invoice.notes && (
              <View style={styles.notesContent}>
                <Text style={styles.label}>Notes:</Text>
                <Text style={styles.text}>{invoice.notes}</Text>
              </View>
            )}
            {invoice.paymentInstructions && (
              <View>
                <Text style={styles.label}>Payment Instructions:</Text>
                <Text style={styles.text}>{invoice.paymentInstructions}</Text>
              </View>
            )}
          </View>
        )}
      </Page>
    </Document>
  )
} 