import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

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
const MAX_AI_REQUESTS_PER_WINDOW = 10 // 10 requests per hour

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
				{ error: 'No response from AI' },
				{ status: 500 }
			)
		}
		
		try {
			// Validate the JSON structure before returning
			const parsedResponse = JSON.parse(response)
			return NextResponse.json(parsedResponse)
		} catch (parseError) {
			console.error('Error parsing AI response:', parseError)
			return NextResponse.json(
				{ error: 'Failed to parse AI response' },
				{ status: 500 }
			)
		}
	} catch (error) {
		console.error('Error parsing invoice text:', error)
		
		let status = 500
		let message = 'Failed to parse invoice text'
		
		if (error instanceof Error) {
			if (error.message === 'Request timed out') {
				status = 408
				message = 'Request timed out'
			} else if (error.message.includes('429')) {
				status = 429
				message = 'Too many requests to AI service'
			}
		}
		
		return NextResponse.json(
			{ error: message },
			{ status }
		)
	}
} 