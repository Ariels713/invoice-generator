import { NextRequest, NextResponse } from 'next/server';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png"];

// Basic check of file signatures (magic numbers)
async function verifyFileSignature(buffer: ArrayBuffer): Promise<string | null> {
  const arr = new Uint8Array(buffer).subarray(0, 4);
  const header = Array.from(arr).map(byte => byte.toString(16)).join('');
  
  // Check file signatures
  if (header.startsWith('ffd8')) {
    return 'image/jpeg'; // JPEG
  } else if (header.startsWith('89504e47')) {
    return 'image/png'; // PNG
  }
  
  return null; // Unknown file type
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ 
        valid: false, 
        error: 'No file provided' 
      }, { status: 400 });
    }
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        valid: false, 
        error: 'File size exceeds maximum allowed (2MB)' 
      }, { status: 400 });
    }
    
    // Check declared MIME type
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Invalid file type. Only JPG, JPEG & PNG files are allowed' 
      }, { status: 400 });
    }
    
    // Verify file content by checking its binary signature
    const buffer = await file.arrayBuffer();
    const actualFileType = await verifyFileSignature(buffer);
    
    if (!actualFileType || !ACCEPTED_IMAGE_TYPES.includes(actualFileType)) {
      return NextResponse.json({ 
        valid: false, 
        error: 'File content does not match an accepted image format' 
      }, { status: 400 });
    }
    
    // File is valid
    return NextResponse.json({ 
      valid: true, 
      type: actualFileType,
      size: file.size
    });
    
  } catch (error) {
    console.error('File validation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ 
      valid: false, 
      error: `File validation error: ${errorMessage}` 
    }, { status: 500 });
  }
} 