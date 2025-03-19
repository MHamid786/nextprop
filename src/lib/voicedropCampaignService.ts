import axios from 'axios';

// VoiceDrop API configuration 
export const VOICEDROP_API_KEY = 'vd_L6JGDq5Vj924Eq7k7Mb1';
export const VOICEDROP_API_BASE_URL = 'https://api.voicedrop.ai/v1';
export const DEFAULT_VOICE_CLONE_ID = 'dodUUtwsqo09HrH2RO8w';

// Interface for campaign settings
export interface CampaignSettings {
  startTime: string;
  endTime: string;
  timezone: string;
  maxPerHour: number;
  daysOfWeek: string[];
  delayMinutes?: number;
  dailyLimit?: number;
}

// Interface for contact/prospect data
export interface ContactData {
  id: string;
  firstName?: string;
  lastName?: string;
  phone: string;
  streetName?: string;
  address1?: string;
  city?: string;
  state?: string;
  zip?: string;
  email?: string;
  propertyLink?: string;
  [key: string]: any;
}

// Interface for campaign data
export interface CampaignData {
  name: string;
  script: string;
  senderPhone: string;
  settings: CampaignSettings;
  contacts: ContactData[];
  webhookUrl: string;
}

// Error handling utility
const handleApiError = (error: any): never => {
  console.error('VoiceDrop API Error:', error);
  
  if (error.response?.data) {
    console.error('Response data:', error.response.data);
    throw new Error(`VoiceDrop API Error: ${error.response.data.message || JSON.stringify(error.response.data)}`);
  }
  
  throw new Error(`VoiceDrop API Error: ${error.message || 'Unknown error'}`);
};

/**
 * Create a new campaign in VoiceDrop
 */
export async function createCampaign(campaignData: CampaignData): Promise<string> {
  try {
    // Format days of week as expected by VoiceDrop API
    const daysOfWeek = campaignData.settings.daysOfWeek.map(day => {
      const dayMap: Record<string, string> = {
        'Mon': 'monday',
        'Tue': 'tuesday',
        'Wed': 'wednesday',
        'Thu': 'thursday',
        'Fri': 'friday',
        'Sat': 'saturday',
        'Sun': 'sunday'
      };
      return dayMap[day] || day.toLowerCase();
    });
    
    // Format start/end times to 24-hour format if needed
    const formatTime = (timeString: string): string => {
      // If already in 24-hour format, return as is
      if (timeString.match(/^\d{1,2}:\d{2}$/)) {
        return timeString;
      }
      
      // Convert 12-hour format to 24-hour
      const [time, modifier] = timeString.split(' ');
      let [hours, minutes] = time.split(':');
      
      if (hours === '12') {
        hours = '00';
      }
      
      if (modifier === 'PM') {
        hours = (parseInt(hours, 10) + 12).toString();
      }
      
      return `${hours.padStart(2, '0')}:${minutes}`;
    };
    
    // Create campaign payload
    const payload = {
      name: campaignData.name,
      script: campaignData.script,
      voice_clone_id: DEFAULT_VOICE_CLONE_ID,
      from_number: campaignData.senderPhone,
      schedule: {
        days_of_week: daysOfWeek,
        start_time: formatTime(campaignData.settings.startTime),
        end_time: formatTime(campaignData.settings.endTime),
        timezone: campaignData.settings.timezone.split(' ')[0], // Extract just the timezone code (EST)
        max_per_hour: campaignData.settings.maxPerHour,
        // Include these if they exist
        ...(campaignData.settings.delayMinutes && { delay_minutes: campaignData.settings.delayMinutes }),
        ...(campaignData.settings.dailyLimit && { daily_limit: campaignData.settings.dailyLimit })
      },
      webhook_url: campaignData.webhookUrl
    };
    
    // Make the API call to VoiceDrop
    const response = await axios.post(
      `${VOICEDROP_API_BASE_URL}/campaigns`,
      payload,
      { 
        headers: {
          'Content-Type': 'application/json',
          'auth-key': VOICEDROP_API_KEY
        }
      }
    );
    
    console.log('Campaign created in VoiceDrop:', response.data);
    
    // Return the VoiceDrop campaign ID
    return response.data.id;
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Add a prospect (contact) to a VoiceDrop campaign
 */
export async function addProspectToCampaign(voicedropCampaignId: string, contact: ContactData): Promise<any> {
  try {
    // Prepare personalization variables
    const personalizationVariables: Record<string, string> = {
      first_name: contact.firstName || '',
      last_name: contact.lastName || ''
    };
    
    // Add other fields if they exist
    if (contact.streetName) personalizationVariables.street_name = contact.streetName;
    if (contact.address1) personalizationVariables.address = contact.address1;
    if (contact.city) personalizationVariables.city = contact.city;
    if (contact.state) personalizationVariables.state = contact.state;
    if (contact.zip) personalizationVariables.zip = contact.zip;
    if (contact.email) personalizationVariables.email = contact.email;
    if (contact.propertyLink) personalizationVariables.property_link = contact.propertyLink;
    
    // Add any other custom fields from the contact
    Object.keys(contact).forEach(key => {
      if (!['id', 'firstName', 'lastName', 'phone', 'streetName', 'address1', 'city', 'state', 'zip', 'email', 'propertyLink'].includes(key)) {
        personalizationVariables[key] = String(contact[key] || '');
      }
    });
    
    // Create prospect payload
    const payload = {
      prospect_phone: contact.phone,
      personalization_variables: personalizationVariables,
      metadata: {
        contact_id: contact.id
      }
    };
    
    // Make the API call to VoiceDrop
    const response = await axios.post(
      `${VOICEDROP_API_BASE_URL}/campaigns/${voicedropCampaignId}/prospects`,
      payload,
      { 
        headers: {
          'Content-Type': 'application/json',
          'auth-key': VOICEDROP_API_KEY
        }
      }
    );
    
    console.log(`Prospect ${contact.id} added to campaign ${voicedropCampaignId}:`, response.data);
    
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Update a campaign's status (active, paused, archived)
 */
export async function updateCampaignStatus(voicedropCampaignId: string, status: 'active' | 'paused' | 'archived'): Promise<boolean> {
  try {
    // Make the API call to VoiceDrop
    const response = await axios.patch(
      `${VOICEDROP_API_BASE_URL}/campaigns/${voicedropCampaignId}/status`,
      { status },
      { 
        headers: {
          'Content-Type': 'application/json',
          'auth-key': VOICEDROP_API_KEY
        }
      }
    );
    
    console.log(`Campaign ${voicedropCampaignId} status updated to ${status}:`, response.data);
    
    return true;
  } catch (error) {
    console.error(`Error updating campaign ${voicedropCampaignId} status:`, error);
    return false;
  }
}

/**
 * Get campaign report data
 */
export async function getCampaignReport(voicedropCampaignId: string): Promise<string> {
  try {
    // Make the API call to VoiceDrop
    const response = await axios.get(
      `${VOICEDROP_API_BASE_URL}/campaigns/${voicedropCampaignId}/reports`,
      { 
        headers: {
          'Content-Type': 'application/json',
          'auth-key': VOICEDROP_API_KEY
        }
      }
    );
    
    console.log(`Got report link for campaign ${voicedropCampaignId}:`, response.data);
    
    // Return the CSV URL
    return response.data.csv_url;
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * List all campaigns
 */
export async function listCampaigns(): Promise<any[]> {
  try {
    // Make the API call to VoiceDrop
    const response = await axios.get(
      `${VOICEDROP_API_BASE_URL}/campaigns`,
      { 
        headers: {
          'Content-Type': 'application/json',
          'auth-key': VOICEDROP_API_KEY
        }
      }
    );
    
    console.log('VoiceDrop campaigns:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('Error listing campaigns:', error);
    return [];
  }
}

/**
 * Utility to fetch and process a CSV from a URL
 */
export async function fetchAndParseCSV(csvUrl: string): Promise<any[]> {
  try {
    // Fetch the CSV
    const response = await axios.get(csvUrl);
    const csvData = response.data;
    
    // Simple CSV parser (consider using a proper CSV library in production)
    const lines = csvData.split('\n');
    const headers = lines[0].split(',').map((header: string) => header.trim());
    
    const results = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = lines[i].split(',').map((value: string) => value.trim());
      const entry: Record<string, string> = {};
      
      headers.forEach((header: string, index: number) => {
        entry[header] = values[index] || '';
      });
      
      results.push(entry);
    }
    
    return results;
  } catch (error) {
    console.error('Error parsing CSV:', error);
    return [];
  }
}

/**
 * Get campaign statistics
 */
export async function getCampaignStatistics(voicedropCampaignId: string): Promise<any> {
  try {
    // Get report URL
    const csvUrl = await getCampaignReport(voicedropCampaignId);
    
    // Parse the CSV
    const results = await fetchAndParseCSV(csvUrl);
    
    // Calculate statistics
    const stats = {
      total: results.length,
      delivered: results.filter(r => r.status === 'delivered' || r.status === 'completed').length,
      failed: results.filter(r => r.status === 'failed' || r.status === 'error').length,
      pending: results.filter(r => r.status === 'pending' || r.status === 'scheduled').length,
      callbacks: results.filter(r => r.callback === 'true' || r.status === 'callback').length
    };
    
    return {
      stats,
      details: results
    };
  } catch (error) {
    console.error(`Error getting campaign ${voicedropCampaignId} statistics:`, error);
    return {
      stats: {
        total: 0,
        delivered: 0,
        failed: 0,
        pending: 0,
        callbacks: 0
      },
      details: []
    };
  }
} 