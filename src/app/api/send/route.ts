import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { invoice, recipientEmail, pdfBase64 } = await request.json();
    
    if (!invoice || !recipientEmail) {
      return NextResponse.json(
        { error: 'Invoice data and recipient email are required' },
        { status: 400 }
      );
    }
    
    // Convert base64 back to buffer for the attachment
    const pdfBuffer = pdfBase64 ? Buffer.from(pdfBase64, 'base64') : null;
    
    if (!pdfBuffer) {
      return NextResponse.json(
        { error: 'PDF data is required' },
        { status: 400 }
      );
    }
    
    // Send email with PDF attachment
    const { data, error } = await resend.emails.send({
      from: `Invoice Generator <onboarding@resend.dev>`,
      to: [recipientEmail],
      subject: `Invoice #${invoice.invoiceNumber} from ${invoice.sender.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h1 style="color: #05a588;">Your Invoice #${invoice.invoiceNumber}</h1>
          <p>Hello from ${invoice.sender.name},</p>
          <p>Your invoice has been generated and is attached to this email.</p>
          <div style="margin: 20px 0; padding: 20px; border: 1px solid #e5e7eb; border-radius: 5px;">
            <h2>Invoice Summary</h2>
            <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
            <p><strong>Issue Date:</strong> ${invoice.date}</p>
            <p><strong>Due Date:</strong> ${invoice.dueDate}</p>
            <p><strong>Total Amount:</strong> ${invoice.total} ${invoice.currency}</p>
          </div>
          <p>Thank you for your business!</p>
        </div>
      `,
      attachments: [
        {
          filename: `invoice-${invoice.invoiceNumber || 'preview'}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    if (error) {
      console.error('Resend API error:', error);
      return NextResponse.json({ 
        error: `Resend API error: ${typeof error === 'object' ? JSON.stringify(error) : error}` 
      }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Server error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: `Server error: ${errorMessage}` },
      { status: 500 }
    );
  }
} 