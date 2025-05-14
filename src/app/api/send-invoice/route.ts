import { NextResponse } from 'next/server'
import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

export async function POST(request: Request) {
	try {
		const { invoice, email } = await request.json()

		// Generate PDF (you would implement this)
		const pdfBuffer = Buffer.from('PDF content') // Replace with actual PDF generation

		const msg = {
			to: email,
			from: process.env.SENDGRID_FROM_EMAIL!,
			subject: `Invoice #${invoice.invoiceNumber} from ${invoice.sender.name}`,
			text: `Please find attached invoice #${invoice.invoiceNumber} from ${invoice.sender.name}.`,
			attachments: [
				{
					content: pdfBuffer.toString('base64'),
					filename: `invoice-${invoice.invoiceNumber}.pdf`,
					type: 'application/pdf',
					disposition: 'attachment'
				}
			]
		}

		await sgMail.send(msg)

		return NextResponse.json({ success: true })
	} catch (error) {
		console.error('Error sending email:', error)
		return NextResponse.json(
			{ error: 'Failed to send email' },
			{ status: 500 }
		)
	}
} 