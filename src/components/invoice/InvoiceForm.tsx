import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { InvoiceFormData, Company, Invoice } from '@/types/invoice'
import { currencies } from '@/lib/currencies'
import { parseInvoiceText } from '@/lib/ai-service'
import styles from './invoice-form.module.css'
import { InvoicePreview } from './InvoicePreview'
import { useRef } from 'react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

const companySchema = z.object({
	name: z.string().min(1, 'Company name is required'),
	address: z.string().min(1, 'Address is required'),
	city: z.string().min(1, 'City is required'),
	state: z.string().min(1, 'State is required'),
	zipCode: z.string().min(1, 'ZIP code is required'),
	country: z.string().min(1, 'Country is required'),
	email: z.string().email('Invalid email address'),
	phone: z.string().min(1, 'Phone number is required'),
	website: z.string().optional()
})

const invoiceItemSchema = z.object({
	description: z.string().min(1, 'Description is required'),
	quantity: z.number().min(0, 'Quantity must be positive'),
	rate: z.number().min(0, 'Rate must be positive')
})

const invoiceSchema = z.object({
	invoiceNumber: z.string().min(1, 'Invoice number is required'),
	date: z.string().min(1, 'Date is required'),
	dueDate: z.string().min(1, 'Due date is required'),
	sender: companySchema,
	recipient: companySchema,
	items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
	taxRate: z.number().min(0, 'Tax rate must be positive'),
	currency: z.string().min(1, 'Currency is required'),
	notes: z.string().optional(),
	paymentInstructions: z.string().optional(),
	logo: z.string().optional()
})

interface InvoiceFormProps {
	onSubmit: (data: InvoiceFormData) => void
}

const emptyCompany: Company = {
	name: '',
	address: '',
	city: '',
	state: '',
	zipCode: '',
	country: '',
	email: '',
	phone: '',
}

export function InvoiceForm({ onSubmit }: InvoiceFormProps) {
	const {
		register,
		handleSubmit,
		control,
		setValue,
		watch,
		formState: { errors }
	} = useForm<InvoiceFormData>({
		resolver: zodResolver(invoiceSchema),
		defaultValues: {
			currency: 'USD',
			taxRate: 0,
			items: [{ description: '', quantity: 1, rate: 0 }]
		}
	})

	const { fields, append, remove } = useFieldArray({
		control,
		name: 'items'
	})

	const formData = watch()
	const hiddenPreviewRef = useRef<HTMLDivElement>(null)

	const getInvoicePreviewData = (): Invoice => {
		const items = (formData.items || []).map((item, idx) => {
			const amount = Number(item.quantity) * Number(item.rate)
			return {
				id: String(idx),
				description: item.description,
				quantity: Number(item.quantity),
				rate: Number(item.rate),
				amount
			}
		})
		const subtotal = items.reduce((sum, item) => sum + item.amount, 0)
		const taxAmount = subtotal * (Number(formData.taxRate) || 0) / 100
		const total = subtotal + taxAmount
		return {
			id: 'preview',
			invoiceNumber: formData.invoiceNumber || '',
			date: formData.date || '',
			dueDate: formData.dueDate || '',
			sender: formData.sender || emptyCompany,
			recipient: formData.recipient || emptyCompany,
			items,
			subtotal,
			taxRate: Number(formData.taxRate) || 0,
			taxAmount,
			total,
			currency: formData.currency || 'USD',
			notes: formData.notes,
			paymentInstructions: formData.paymentInstructions,
			logo: formData.logo
		}
	}

	const handleAIParse = async (text: string) => {
		try {
			const parsedData = await parseInvoiceText(text)
			console.log('AI parsed data:', parsedData)
			Object.entries(parsedData).forEach(([key, value]) => {
				setValue(key as keyof InvoiceFormData, value)
			})
		} catch (error) {
			console.error('Error parsing with AI:', error)
			// TODO: Add proper error handling UI
		}
	}

	const handleDownloadPDF = async () => {
		if (!hiddenPreviewRef.current) return
		const node = hiddenPreviewRef.current.querySelector('div')
		if (!node) return
		try {
			const canvas = await html2canvas(node, {
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
			pdf.save(`invoice-${formData.invoiceNumber || 'preview'}.pdf`)
		} catch (error) {
			console.error('Error generating PDF:', error)
		}
	}

	return (
		<form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
			{/* AI Input Section */}
			<div className={styles.section}>
				<h2 className={styles.label}>AI Invoice Parser</h2>
				<textarea
					className={styles.textarea}
					placeholder="Enter invoice details in plain text..."
					onChange={(e) => handleAIParse(e.target.value)}
				/>
				<button
					type="submit"
					className={styles.button}
					style={{ marginTop: '1rem' }}
				>
					Generate Invoice
				</button>
			</div>

			{/* Basic Invoice Info */}
			<div className={styles.row}>
				<div className={styles.col}>
					<label className={styles.label}>Invoice Number</label>
					<input
						type="text"
						{...register('invoiceNumber')}
						className={styles.input}
					/>
					{errors.invoiceNumber && (
						<p className={styles.error}>{errors.invoiceNumber.message}</p>
					)}
				</div>

				<div className={styles.col}>
					<label className={styles.label}>Currency</label>
					<select
						{...register('currency')}
						className={styles.select}
					>
						{currencies.map((currency) => (
							<option key={currency.code} value={currency.code}>
								{currency.flag} {currency.code} - {currency.name}
							</option>
						))}
					</select>
				</div>
			</div>

			{/* Company Information */}
			<div className={styles.row}>
				<div className={styles.col}>
					<h3 className={styles.label}>Sender Information</h3>
					{Object.keys(companySchema.shape).map((field) => (
						<div key={field}>
							<label className={styles.label}>
								{field.replace(/([A-Z])/g, ' $1').trim()}
							</label>
							<input
								type={field === 'email' ? 'email' : 'text'}
								{...register(`sender.${field as keyof Company}`)}
								className={styles.input}
							/>
						</div>
					))}
				</div>

				<div className={styles.col}>
					<h3 className={styles.label}>Recipient Information</h3>
					{Object.keys(companySchema.shape).map((field) => (
						<div key={field}>
							<label className={styles.label}>
								{field.replace(/([A-Z])/g, ' $1').trim()}
							</label>
							<input
								type={field === 'email' ? 'email' : 'text'}
								{...register(`recipient.${field as keyof Company}`)}
								className={styles.input}
							/>
						</div>
					))}
				</div>
			</div>

			{/* Invoice Items */}
			<div className={styles.section}>
				<h3 className={styles.label}>Invoice Items</h3>
				{fields.map((field, index) => (
					<div key={field.id} className={styles.row}>
						<div className={styles.col}>
							<label className={styles.label}>Description</label>
							<input
								type="text"
								{...register(`items.${index}.description`)}
								className={styles.input}
							/>
						</div>
						<div className={styles.col}>
							<label className={styles.label}>Quantity</label>
							<input
								type="number"
								{...register(`items.${index}.quantity`, { valueAsNumber: true })}
								className={styles.input}
							/>
						</div>
						<div className={styles.col}>
							<label className={styles.label}>Rate</label>
							<input
								type="number"
								{...register(`items.${index}.rate`, { valueAsNumber: true })}
								className={styles.input}
							/>
						</div>
						<button
							type="button"
							onClick={() => remove(index)}
							className={styles.removeBtn}
						>
							Remove
						</button>
					</div>
				))}
				<button
					type="button"
					onClick={() => append({ description: '', quantity: 1, rate: 0 })}
					className={styles.addItemBtn}
				>
					Add Item
				</button>
			</div>

			{/* Tax Rate */}
			<div className={styles.section}>
				<label className={styles.label}>Tax Rate (%)</label>
				<input
					type="number"
					{...register('taxRate', { valueAsNumber: true })}
					className={styles.input}
				/>
			</div>

			{/* Notes and Payment Instructions */}
			<div className={styles.section}>
				<div>
					<label className={styles.label}>Notes</label>
					<textarea
						{...register('notes')}
						className={styles.textarea}
					/>
				</div>
				<div>
					<label className={styles.label}>Payment Instructions</label>
					<textarea
						{...register('paymentInstructions')}
						className={styles.textarea}
					/>
				</div>
			</div>

			{/* Action Buttons */}
			<div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
				<button type="button" className={styles.button} onClick={handleDownloadPDF}>
					Download as PDF
				</button>
				<button type="button" className={styles.button}>
					Email Invoice
				</button>
			</div>

			{/* Styled Invoice Preview Section */}
			<div style={{ display: 'flex', flexDirection: 'row', gap: '2rem', marginTop: '3rem', alignItems: 'flex-start' }}>
				{/* Visible, scaled-down preview */}
				<div style={{ flex: 1, transform: 'scale(0.7)', transformOrigin: 'top left', minWidth: 0 }}>
					<InvoicePreview invoice={getInvoicePreviewData()} />
				</div>
				{/* Visible, full-size preview for PDF generation (for testing) */}
				<div ref={hiddenPreviewRef} aria-hidden="false">
					<InvoicePreview invoice={getInvoicePreviewData()} />
				</div>
			</div>
		</form>
	)
} 