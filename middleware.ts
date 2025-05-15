import { NextRequest, NextResponse } from 'next/server';

// Security headers to apply to all requests
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://api.openai.com; frame-ancestors 'none'"
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  }
];

export function middleware(request: NextRequest) {
  // Get the response
  const response = NextResponse.next();
  
  // Check if request has an allowed origin for CORS
  if (request.method === 'OPTIONS') {
    return handleCORS(request);
  }
  
  // Apply security headers to all responses
  securityHeaders.forEach(({ key, value }) => {
    response.headers.set(key, value);
  });
  
  // For API routes, add CORS headers
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  
  return response;
}

// Handle OPTIONS requests for CORS preflight
function handleCORS(request: NextRequest) {
  // Create a new response
  const response = new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400', // 24 hours
    },
  });
  
  return response;
}

export const config = {
  // Apply middleware to all routes
  matcher: '/(.*)',
}; 