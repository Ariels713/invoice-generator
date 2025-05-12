import { Currency } from '@/types/invoice'

export const currencies: Currency[] = [
	{
		code: 'USD',
		symbol: '$',
		name: 'US Dollar',
		flag: '🇺🇸'
	},
	{
		code: 'EUR',
		symbol: '€',
		name: 'Euro',
		flag: '🇪🇺'
	},
	{
		code: 'GBP',
		symbol: '£',
		name: 'British Pound',
		flag: '🇬🇧'
	},
	{
		code: 'JPY',
		symbol: '¥',
		name: 'Japanese Yen',
		flag: '🇯🇵'
	},
	{
		code: 'CAD',
		symbol: '$',
		name: 'Canadian Dollar',
		flag: '🇨🇦'
	},
	{
		code: 'AUD',
		symbol: '$',
		name: 'Australian Dollar',
		flag: '🇦🇺'
	}
]

export const formatCurrency = (amount: number, currency: string): string => {
	const currencyInfo = currencies.find(c => c.code === currency)
	if (!currencyInfo) return amount.toString()

	const formatter = new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: currency,
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	})

	return formatter.format(amount)
}

export const getCurrencySymbol = (currency: string): string => {
	const currencyInfo = currencies.find(c => c.code === currency)
	return currencyInfo?.symbol || currency
} 