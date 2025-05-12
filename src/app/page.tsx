'use client'

import { useState } from 'react'
import { InvoiceForm } from '@/components/invoice/InvoiceForm'
import { InvoicePreview } from '@/components/invoice/InvoicePreview'
import { Invoice } from '@/types/invoice'

export default function Home() {
	const [invoice, setInvoice] = useState<Invoice | null>(null)

	const handleFormSubmit = (data: any) => {
		// Calculate totals
		const items = data.items.map((item: any) => ({
			...item,
			id: crypto.randomUUID(),
			amount: item.quantity * item.rate
		}))

		const subtotal = items.reduce((sum: number, item: any) => sum + item.amount, 0)
		const taxAmount = (subtotal * data.taxRate) / 100
		const total = subtotal + taxAmount

		const newInvoice: Invoice = {
			id: crypto.randomUUID(),
			...data,
			items,
			subtotal,
			taxAmount,
			total
		}

		setInvoice(newInvoice)
	}

	return (
		<main className="min-h-screen py-8">
			<div className="container mx-auto px-4" style={{ paddingInline: '1rem', paddingBlock: '1rem', backgroundColor: 'var(--foreground)' }}>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
					<div className="bg-white p-6 rounded-lg shadow">
						<InvoiceForm onSubmit={handleFormSubmit} />
					</div>

					<div className="bg-white p-6 rounded-lg shadow">
						{invoice ? (
							<InvoicePreview invoice={invoice} />
						) : (
							<div className="text-center text-gray-500 py-8">
								Fill out the form to see a preview of your invoice
							</div>
						)}
					</div>
				</div>
			</div>
		</main>
	)
}
