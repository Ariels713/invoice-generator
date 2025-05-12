import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

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

If any field is not mentioned in the text, set it to null. Do not use any other keys or change the key names. Only return the JSON object.`

export async function POST(req: Request) {
	try {
		const { text } = await req.json()
		const completion = await openai.chat.completions.create({
			messages: [
				{ role: 'system', content: INVOICE_PARSE_PROMPT },
				{ role: 'user', content: text }
			],
			model: 'gpt-3.5-turbo',
			response_format: { type: 'json_object' }
		})
		const response = completion.choices[0]?.message?.content
		if (!response) {
			return NextResponse.json({ error: 'No response from AI' }, { status: 500 })
		}
		return NextResponse.json(JSON.parse(response))
	} catch (error) {
		console.error('Error parsing invoice text:', error)
		return NextResponse.json({ error: 'Failed to parse invoice text' }, { status: 500 })
	}
} 