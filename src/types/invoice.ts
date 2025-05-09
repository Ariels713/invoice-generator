export interface Company {
	name: string
	address: string
	city: string
	state: string
	zipCode: string
	country: string
	email: string
	phone: string
	website?: string
}

export interface InvoiceItem {
	id: string
	description: string
	quantity: number
	rate: number
	amount: number
}

export interface Invoice {
	id: string
	invoiceNumber: string
	date: string
	dueDate: string
	sender: Company
	recipient: Company
	items: InvoiceItem[]
	subtotal: number
	taxRate: number
	taxAmount: number
	total: number
	currency: string
	notes?: string
	paymentInstructions?: string
	logo?: string
}

export type Currency = {
	code: string
	symbol: string
	name: string
	flag: string
}

export interface InvoiceFormData extends Omit<Invoice, 'id' | 'subtotal' | 'taxAmount' | 'total'> {
	items: Omit<InvoiceItem, 'id' | 'amount'>[]
} 