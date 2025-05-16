import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Add these interfaces based on the prompt structure
interface InvoiceItem {
	description: string | null
	quantity: number | null
	rate: number | null
}

interface InvoiceParty {
	name: string | null
	address: string | null
	city: string | null
	state: string | null
	zipCode: string | null
	country: string | null
	email: string | null
	phone: string | null
}

interface ParsedInvoice {
	invoiceNumber: string | null
	invoiceName: string | null
	date: string | null
	dueDate: string | null
	sender: InvoiceParty | null
	recipient: InvoiceParty | null
	items: InvoiceItem[] | null
	taxRate: number | null
	currency: string | null
	notes?: string | null
	paymentInstructions?: string | null
	shipping?: number | null
	warning?: string
}

const openai = new OpenAI({ 
	apiKey: process.env.OPENAI_API_KEY!,
	defaultHeaders: {
		'OpenAI-Beta': 'assistants=v1',
	},
})

const INVOICE_PARSE_PROMPT = `You are an AI assistant that helps parse invoice information from text. 
Return a JSON object with these exact keys:
- invoiceNumber (string)
- invoiceName (string, a short 3-5 word description of the invoice)
- date (string)
- dueDate (string)
- sender (object: { name, address, city, state, zipCode, country, email, phone })
- recipient (object: { name, address, city, state, zipCode, country, email, phone })
- items (array of objects: { description, quantity, rate })
- taxRate (number)
- currency (string)
- notes (string, optional)
- paymentInstructions (string, optional)
- shipping (number, optional)

If any field is not mentioned in the text, set it to null. Do not use any other keys or change the key names. Only return the JSON object.`

// In-memory rate limiting (note: in production, use Redis or similar)
type RateLimitEntry = {
	count: number
	lastRequest: number
}

const AI_LIMITS = new Map<string, RateLimitEntry>()
const RATE_LIMIT_WINDOW = 3600 * 1000 // 1 hour in ms
const MAX_AI_REQUESTS_PER_WINDOW = 1000 // 10 requests per hour

function getRateLimitKey(request: NextRequest): string {
	// In production, use a more robust way to identify users
	const ip = request.headers.get('x-forwarded-for') || 
			 request.headers.get('x-real-ip') || 
			 'unknown'
	return `ai_rate_limit:${ip}`
}

function isRateLimited(request: NextRequest): boolean {
	const key = getRateLimitKey(request)
	const now = Date.now()
	
	// Get current rate limit info
	const limitInfo = AI_LIMITS.get(key) || { count: 0, lastRequest: now }
	
	// Reset if outside window
	if (now - limitInfo.lastRequest > RATE_LIMIT_WINDOW) {
		limitInfo.count = 0
		limitInfo.lastRequest = now
	}
	
	// Check if limit exceeded
	if (limitInfo.count >= MAX_AI_REQUESTS_PER_WINDOW) {
		return true
	}
	
	// Update counter
	limitInfo.count += 1
	limitInfo.lastRequest = now
	AI_LIMITS.set(key, limitInfo)
	
	return false
}

// Sanitize input to prevent prompt injection
function sanitizeInput(text: string): string {
	// Basic sanitization with string manipulation
	const sanitized = text
		.replace(/<[^>]*>/g, '') // Remove HTML tags
		.replace(/system:/gi, '[filtered]')
		.replace(/assistant:/gi, '[filtered]')
		.replace(/user:/gi, '[filtered]')
		.replace(/role:/gi, '[filtered]')
		.replace(/```/g, '') // Remove code blocks
	
	return sanitized
}

export async function POST(req: NextRequest) {
	try {
		// Check rate limit before processing
		if (isRateLimited(req)) {
			return NextResponse.json(
				{ error: 'Rate limit exceeded. Please try again later.' },
				{ status: 429 }
			)
		}
		
		const { text } = await req.json()
		
		if (!text || typeof text !== 'string') {
			return NextResponse.json(
				{ error: 'Text content is required' },
				{ status: 400 }
			)
		}
		
		// Check text length to prevent abuse
		if (text.length > 10000) {
			return NextResponse.json(
				{ error: 'Text exceeds maximum allowed length' },
				{ status: 400 }
			)
		}
		
		// Sanitize user input
		const sanitizedText = sanitizeInput(text)
		
		// Create a Promise with timeout for OpenAI
		const openAIWithTimeout = Promise.race([
			openai.chat.completions.create({
				messages: [
					{ role: 'system', content: INVOICE_PARSE_PROMPT },
					{ role: 'user', content: sanitizedText }
				],
				model: 'gpt-3.5-turbo',
				response_format: { type: 'json_object' },
				max_tokens: 2000,
				temperature: 0.2, // Lower temperature for more consistent results
			}),
			new Promise((_, reject) => 
				setTimeout(() => reject(new Error('Request timed out')), 15000)
			)
		])
		
		const completion = await openAIWithTimeout as OpenAI.Chat.Completions.ChatCompletion
		
		const response = completion.choices[0]?.message?.content
		
		if (!response) {
			return NextResponse.json(
				{ error: 'Unable to generate content. Please try again.' },
				{ status: 400 }
			)
		}
		
		try {
			// Validate the JSON structure before returning
			const parsedResponse = JSON.parse(response) as ParsedInvoice
			
			// Check if the parsed response has any non-null values
			const hasValidData = !!(
				parsedResponse.invoiceNumber || 
				parsedResponse.date || 
				parsedResponse.dueDate ||
				(parsedResponse.sender && Object.values(parsedResponse.sender).some(val => val)) ||
				(parsedResponse.recipient && Object.values(parsedResponse.recipient).some(val => val)) ||
				(parsedResponse.items && parsedResponse.items.length > 0 && parsedResponse.items.some((item: InvoiceItem) => item.description))
			);
			
			if (!hasValidData) {
				// Return the empty data with a status 200 but include a message
				return NextResponse.json({
					...parsedResponse,
					warning: 'The content provided does not appear to contain invoice information. Please provide specific invoice details.'
				})
			}
			
			return NextResponse.json(parsedResponse)
		} catch (parseError) {
			console.error('Error parsing AI response:', parseError)
			return NextResponse.json(
				{ error: 'Unable to process the response. Please try again with different text.' },
				{ status: 400 }
			)
		}
	} catch (error) {
		console.error('Error parsing invoice text:', error)
		
		const status = 400
		let message = 'Failed to process your request. Please try again.'
		
		if (error instanceof Error) {
			if (error.message === 'Request timed out') {
				message = 'Request timed out. Please try again.'
			} else if (error.message.includes('429')) {
				message = 'Too many requests. Please try again later.'
			}
		}
		
		return NextResponse.json(
			{ error: message },
			{ status }
		)
	}
} 