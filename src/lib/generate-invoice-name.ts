import { InvoiceFormData } from '@/types/invoice'

/**
 * Generate a concise invoice name (3-5 words) from invoice details.
 * @param parsedData The parsed invoice data object
 * @returns A summary string for the invoice name
 */
export function generateInvoiceName(parsedData: Partial<InvoiceFormData>): string {
	const parts: string[] = []

	if (parsedData.items?.length) {
		parts.push(parsedData.items.map((item) => item.description).join(', '))
	}
	if (parsedData.recipient?.name) {
		parts.push(parsedData.recipient.name)
	}
	if (parsedData.date) {
		parts.push(parsedData.date)
	}

	// Join and take first 3-5 words
	return parts.join(' ').split(' ').slice(0, 5).join(' ') || 'Invoice'
} 