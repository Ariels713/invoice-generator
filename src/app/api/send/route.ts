import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { z } from 'zod';

const resend = new Resend(process.env.RESEND_API_KEY);

// Email validation schema
const emailSchema = z.string().email("Invalid email address");

// In-memory rate limiting (note: in production, use Redis or similar)
type RateLimitEntry = {
  count: number;
  lastRequest: number;
};

const EMAIL_LIMITS = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW = 3600 * 1000; // 1 hour in ms
const MAX_EMAILS_PER_WINDOW = 5; // 5 emails per hour

function getRateLimitKey(request: NextRequest): string {
  // In production, use a more robust way to identify users
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown';
  return `email_rate_limit:${ip}`;
}

function isRateLimited(request: NextRequest): boolean {
  const key = getRateLimitKey(request);
  const now = Date.now();
  
  // Get current rate limit info
  const limitInfo = EMAIL_LIMITS.get(key) || { count: 0, lastRequest: now };
  
  // Reset if outside window
  if (now - limitInfo.lastRequest > RATE_LIMIT_WINDOW) {
    limitInfo.count = 0;
    limitInfo.lastRequest = now;
  }
  
  // Check if limit exceeded
  if (limitInfo.count >= MAX_EMAILS_PER_WINDOW) {
    return true;
  }
  
  // Update counter
  limitInfo.count += 1;
  limitInfo.lastRequest = now;
  EMAIL_LIMITS.set(key, limitInfo);
  
  return false;
}

export async function POST(request: NextRequest) {
  try {
    // Check rate limit before processing
    if (isRateLimited(request)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }
    
    const { invoice, recipientEmail, pdfBase64 } = await request.json();
    
    if (!invoice || !recipientEmail) {
      return NextResponse.json(
        { error: 'Invoice data and recipient email are required' },
        { status: 400 }
      );
    }
    
    // Validate email
    try {
      emailSchema.parse(recipientEmail);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (validationError) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    // Ensure we have the minimum required data for an invoice
    if (!invoice.sender) {
      return NextResponse.json(
        { error: 'Invoice sender information is required' },
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
    
    // Check PDF size (max 10MB)
    if (pdfBuffer.length > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'PDF file size exceeds maximum allowed (10MB)' },
        { status: 400 }
      );
    }
    
    // Send email with PDF attachment
    const { data, error } = await resend.emails.send({
      from: `Rho <noreply@rho.co>`,
      to: [recipientEmail],
      subject: `Attached is your...`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #151816;">
          <p>While you're here, want to learn how you can:</p>
          <div style="padding-left: 15px;">
            <p>&bull; Generate more yield on your company cash</p>
            <p>&bull; Save $$$ on invoice fees</p>
            <p>&bull; Earn up to 2% cashback?</p>
          </div>
          <p><a href="https://www.rho.co/contact-sales" style="color: #00a688; text-decoration: none; font-weight: 500;">Book a demo</a>  to learn more about the Rho banking platform today.</p>
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