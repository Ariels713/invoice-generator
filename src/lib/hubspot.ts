import axios from 'axios';

const API_KEY = process.env.HUBSPOT_API_KEY;

if (!API_KEY) {
  console.warn('HUBSPOT_API_KEY not defined in environment variables');
}

const hubspotClient = axios.create({
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  }
});

export const getOrCreateContact = async (email: string): Promise<string> => {
  try {
    // Search for contact
    const searchResponse = await hubspotClient.post(
      'https://api.hubapi.com/crm/v3/objects/contacts/search',
      {
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'email',
                operator: 'EQ',
                value: email
              }
            ]
          }
        ]
      }
    );
    
    // Return existing contact ID if found
    if (searchResponse.data.total > 0) {
      return searchResponse.data.results[0].id;
    }
    
    // Create new contact
    const createResponse = await hubspotClient.post(
      'https://api.hubapi.com/crm/v3/objects/contacts',
      {
        properties: {
          email
        }
      }
    );
    
    return createResponse.data.id;
  } catch (error) {
    console.error('Error in getOrCreateContact:', error);
    throw error;
  }
};

export const uploadFile = async (
  fileBuffer: Buffer, 
  filename: string
): Promise<string> => {
  try {
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: 'application/pdf' });
    formData.append('file', blob, filename);
    formData.append('folderPath', '/invoices');
    formData.append('options', JSON.stringify({
      access: 'PRIVATE',
      overwrite: true
    }));
    
    const fileResponse = await axios.post(
      'https://api.hubapi.com/files/v3/files',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    
    return fileResponse.data.id;
  } catch (error) {
    console.error('Error in uploadFile:', error);
    throw error;
  }
};

export const sendEmail = async (
  contactId: string,
  fileId: string,
  subject: string,
  htmlContent: string
): Promise<any> => {
  try {
    // Create email
    const emailResponse = await hubspotClient.post(
      'https://api.hubapi.com/marketing/v3/emails',
      {
        name: `Invoice Email to ${contactId}`,
        type: 'SINGLE_EMAIL',
        subject,
        from: {
          name: 'Rho Team',
          email: process.env.HUBSPOT_FROM_EMAIL
        },
        content: {
          html: htmlContent
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
      }
    );
    
    // Send the email
    const sendResponse = await hubspotClient.post(
      `https://api.hubapi.com/marketing/v3/emails/${emailResponse.data.id}/send`,
      {}
    );
    
    return sendResponse.data;
  } catch (error) {
    console.error('Error in sendEmail:', error);
    throw error;
  }
};
