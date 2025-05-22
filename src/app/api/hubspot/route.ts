import { NextResponse } from 'next/server'

const HUBSPOT_PORTAL_ID = '39998325'
const HUBSPOT_FORM_ID = '7ec96e57-fd09-49c4-b610-68da66a27aa4'

export async function POST(request: Request) {
  try {
    const { context, ...formData } = await request.json()

    // Transform the data into Hubspot's expected format
    const fields = Object.entries(formData).map(([name, value]) => ({
      name,
      value
    }))

    const hubspotData = {
      fields,
      context: context || {
        pageUri: '',
        pageName: ''
      }
    }

    // Send to Hubspot
    const response = await fetch(
      `https://api.hsforms.com/submissions/v3/integration/submit/${HUBSPOT_PORTAL_ID}/${HUBSPOT_FORM_ID}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(hubspotData)
      }
    )

    if (!response.ok) {
      throw new Error(`Hubspot API error: ${response.status}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending data to Hubspot:', error)
    return NextResponse.json(
      { error: 'Failed to send data to Hubspot' },
      { status: 500 }
    )
  }
} 