import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { z } from 'zod';

// Email validation schema
const emailSchema = z.string().email("Invalid email address");

// In-memory rate limiting (reusing existing pattern)
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
    
    // Step 1: Create a contact in HubSpot (simple version)
    const contactResponse = await axios.post(
      'https://api.hubapi.com/crm/v3/objects/contacts/search',
      {
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'email',
                operator: 'EQ',
                value: recipientEmail
              }
            ]
          }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.HUBSPOT_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    let contactId;
    if (contactResponse.data.total === 0) {
      // Create new contact with just email
      const createContactResponse = await axios.post(
        'https://api.hubapi.com/crm/v3/objects/contacts',
        {
          properties: {
            email: recipientEmail
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.HUBSPOT_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      contactId = createContactResponse.data.id;
    } else {
      contactId = contactResponse.data.results[0].id;
    }
    
    // Step 2: Upload the PDF as a file
    const formData = new FormData();
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
    formData.append('file', blob, `invoice-${invoice.invoiceNumber || 'preview'}.pdf`);
    formData.append('folderPath', '/invoices');
    formData.append('options', JSON.stringify({
      access: 'PRIVATE',
      overwrite: true
    }));
    
    const fileUploadResponse = await axios.post(
      'https://api.hubapi.com/files/v3/files',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${process.env.HUBSPOT_API_KEY}`,
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    
    const fileId = fileUploadResponse.data.id;
    
    // Step 3: Create and send email campaign with simple messaging
    const emailResponse = await axios.post(
      'https://api.hubapi.com/marketing/v3/emails',
      {
        name: `Invoice for ${recipientEmail}`,
        type: 'SINGLE_EMAIL',
        subject: `Your Invoice from Rho`,
        from: {
          name: 'Rho Team',
          email: process.env.HUBSPOT_FROM_EMAIL
        },
        content: {
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
              <h1 style="color: #05a588;">Your Invoice</h1>
              <p>Here's your invoice from the team over at Rho!</p>
              <p>We've attached the PDF they generated for you.</p>
              <p>Thank you for your business!</p>
            </div>
          `
        },
        recipients: {
          listIds: [],
          contactIds: [contactId]
        },
        attachments: [
          {
            id: fileId
          }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.HUBSPOT_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Send the email
    const sendResponse = await axios.post(
      `https://api.hubapi.com/marketing/v3/emails/${emailResponse.data.id}/send`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${process.env.HUBSPOT_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return NextResponse.json({ data: sendResponse.data });
  } catch (error) {
    console.error('HubSpot API error:', error);
    let errorMessage = 'Failed to send email';
    
    if (axios.isAxiosError(error)) {
      errorMessage = error.response?.data?.message || errorMessage;
      console.error('Response data:', error.response?.data);
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
