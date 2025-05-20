import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const webhookUrl = process.env.NEXT_PUBLIC_SLACK_WEBHOOK_URL
    
    if (!webhookUrl) {
      return NextResponse.json(
        { error: 'Slack webhook URL not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending Slack notification:', error)
    return NextResponse.json(
      { error: 'Failed to send Slack notification' },
      { status: 500 }
    )
  }
} 