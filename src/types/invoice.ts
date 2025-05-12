export interface Company {
	name: string
	email: string
	address: string
	address2: string
	city: string
	postalCode: string
	country?: string
	state: string
	phone: string
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
	invoiceName: string
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

export interface InvoiceFormData {
	invoiceNumber: string
	invoiceName: string
	date: string
	dueDate: string
	sender: Company
	recipient: Company
	items: Omit<InvoiceItem, 'id' | 'amount'>[]
	taxRate: number
	currency: string
	notes?: string
	paymentInstructions?: string
	logo?: string
} 