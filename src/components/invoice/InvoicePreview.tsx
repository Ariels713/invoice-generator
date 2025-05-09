import { useRef } from 'react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { Invoice } from '@/types/invoice'
import { formatCurrency } from '@/lib/currencies'
import styles from './invoice-preview.module.css'

interface InvoicePreviewProps {
	invoice: Invoice
}

export function InvoicePreview({ invoice }: InvoicePreviewProps) {
	const previewRef = useRef<HTMLDivElement>(null)

	const handleDownloadPDF = async () => {
		if (!previewRef.current) return

		try {
			const canvas = await html2canvas(previewRef.current, {
				scale: 2,
				useCORS: true,
				logging: false
			})

			const imgData = canvas.toDataURL('image/png')
			const pdf = new jsPDF({
				orientation: 'portrait',
				unit: 'mm',
				format: 'a4'
			})

			const imgProps = pdf.getImageProperties(imgData)
			const pdfWidth = pdf.internal.pageSize.getWidth()
			const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width

			pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
			pdf.save(`invoice-${invoice.invoiceNumber}.pdf`)
		} catch (error) {
			console.error('Error generating PDF:', error)
			// TODO: Add proper error handling UI
		}
	}

	return (
		<div>
			<button
				onClick={handleDownloadPDF}
				className={styles.downloadBtn}
			>
				Download PDF
			</button>

			<div
				ref={previewRef}
				className={styles.previewContainer}
			>
				{/* Header */}
				<div className={styles.header}>
					<div>
						{invoice.logo && (
							<img
								src={invoice.logo}
								alt="Company Logo"
								className={styles.logo}
							/>
						)}
						<h1 className={styles.title}>INVOICE</h1>
					</div>
					<div style={{ textAlign: 'right' }}>
						<p style={{ fontWeight: 600 }}>Invoice #{invoice.invoiceNumber}</p>
						<p>Date: {invoice.date}</p>
						<p>Due Date: {invoice.dueDate}</p>
					</div>
				</div>

				{/* Company Information */}
				<div className={styles.row} style={{ marginBottom: 32 }}>
					<div className={styles.companyInfo}>
						<h2 className={styles.label}>From:</h2>
						<p>{invoice.sender.name}</p>
						<p>{invoice.sender.address}</p>
						<p>
							{invoice.sender.city}, {invoice.sender.state} {invoice.sender.zipCode}
						</p>
						<p>{invoice.sender.country}</p>
						<p>{invoice.sender.email}</p>
						<p>{invoice.sender.phone}</p>
					</div>
					<div className={styles.companyInfo}>
						<h2 className={styles.label}>To:</h2>
						<p>{invoice.recipient.name}</p>
						<p>{invoice.recipient.address}</p>
						<p>
							{invoice.recipient.city}, {invoice.recipient.state}{' '}
							{invoice.recipient.zipCode}
						</p>
						<p>{invoice.recipient.country}</p>
						<p>{invoice.recipient.email}</p>
						<p>{invoice.recipient.phone}</p>
					</div>
				</div>

				{/* Items Table */}
				<table className={styles.table}>
					<thead>
						<tr>
							<th>Description</th>
							<th style={{ textAlign: 'right' }}>Quantity</th>
							<th style={{ textAlign: 'right' }}>Rate</th>
							<th style={{ textAlign: 'right' }}>Amount</th>
						</tr>
					</thead>
					<tbody>
						{invoice.items.map((item, index) => (
							<tr key={index}>
								<td>{item.description}</td>
								<td style={{ textAlign: 'right' }}>{item.quantity}</td>
								<td style={{ textAlign: 'right' }}>{formatCurrency(item.rate, invoice.currency)}</td>
								<td style={{ textAlign: 'right' }}>{formatCurrency(item.amount, invoice.currency)}</td>
							</tr>
						))}
					</tbody>
				</table>

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
	)
} 