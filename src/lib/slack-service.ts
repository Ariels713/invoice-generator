interface SlackMessage {
  senderCompany: {
    name: string
    email: string
    phone: string
  }
  recipientCompany: {
    name: string
    email: string
    phone: string
  }
  action: 'download' | 'email'
}

export async function sendSlackNotification(message: SlackMessage) {
  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '🎉 New Invoice Generated!',
        emoji: true
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Action:* ${message.action === 'download' ? 'Downloaded' : 'Emailed'}`
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Sender Company Information:*\n' +
          `• Name: ${message.senderCompany.name}\n` +
          `• Email: ${message.senderCompany.email}\n` +
          `• Phone: ${message.senderCompany.phone}`
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Recipient Company Information:*\n' +
          `• Name: ${message.recipientCompany.name}\n` +
          `• Email: ${message.recipientCompany.email}\n` +
          `• Phone: ${message.recipientCompany.phone}`
      }
    }
  ]

  try {
    console.log('Attempting to send Slack notification...')
    
    const response = await fetch('/api/slack', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ blocks })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to send Slack notification')
    }

    console.log('Slack notification sent successfully')
  } catch (error) {
    console.error('Error sending Slack notification:', error)
    throw error
  }
} 