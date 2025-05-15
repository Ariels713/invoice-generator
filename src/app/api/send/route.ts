import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    console.log('Received email request');
    console.log('API Key exists:', !!process.env.RESEND_API_KEY);
    
    const { invoice, recipientEmail } = await request.json();
    
    if (!invoice || !recipientEmail) {
      return NextResponse.json(
        { error: 'Invoice data and recipient email are required' },
        { status: 400 }
      );
    }
    
    // Just send a simple email without PDF for now
    const { data, error } = await resend.emails.send({
      from: 'Invoice Generator <ariel.rodriguez@rho.co>',
      to: [recipientEmail],
      subject: `Invoice #${invoice.invoiceNumber} from ${invoice.sender.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h1 style="color: #05a588;">Your Invoice #${invoice.invoiceNumber}</h1>
          <p>Hello from ${invoice.sender.name},</p>
          <p>Your invoice has been generated successfully.</p>
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
    return NextResponse.json(
      { error: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
} 