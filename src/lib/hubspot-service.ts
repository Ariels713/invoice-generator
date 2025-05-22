interface HubspotFormData {
  company: string
  email: string
  address: string
  address2?: string
  city: string
  postalCode: string
  phone: string
  recipient_company: string
  recipient_email: string
  recipient_address_1: string
  recipient_address_2?: string
  recipient_city: string
  recipient_postal_code: string
  recipient_phone: string
}

export async function sendToHubspot(formData: HubspotFormData) {
  try {
    console.log('Attempting to send data to Hubspot...')
    
    const hubspotData = {
      ...formData,
      context: {
        pageUri: window.location.href,
        pageName: document.title
      }
    }
    
    const response = await fetch('/api/hubspot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(hubspotData)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to send data to Hubspot')
    }

    console.log('Data sent to Hubspot successfully')
  } catch (error) {
    console.error('Error sending data to Hubspot:', error)
    throw error
  }
} 