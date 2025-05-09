import { InvoiceFormData } from '@/types/invoice'

export async function parseInvoiceText(text: string): Promise<Partial<InvoiceFormData>> {
	try {
		const res = await fetch('/api/parse-invoice', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ text })
		})
		if (!res.ok) throw new Error('Failed to parse invoice text')
		return await res.json()
	} catch (error) {
		console.error('Error parsing invoice text:', error)
		throw new Error('Failed to parse invoice text')
	}
} 