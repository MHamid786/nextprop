import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate request body
    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: "Request body is required" },
        { status: 400 }
      );
    }

    const data = await createSubAccount(body);
    return NextResponse.json(data, { status: 200 });

  } catch (error: any) {
    console.error("POST Error:", error);
    return NextResponse.json(
      { 
        error: error.message || "Internal Server Error",
        details: error.details || null 
      },
      { status: error.status || 500 }
    );
  }
}

const createSubAccount = async (data: any) => {
  try {
    const agencyToken = process.env.AGENCY_API_KEY;
    if (!agencyToken) {
      throw Object.assign(new Error("Agency API key not configured"), { status: 500 });
    }

    console.log(`Agency Token: ${agencyToken}`);
    console.log(`[SubAccount] ${JSON.stringify(data)} [SubAccount]`);

    const password = data.password;
    if (!password) {
      throw Object.assign(new Error("Password is required"), { status: 400 });
    }
    delete data.password;

    const response = await fetch('https://rest.gohighlevel.com/v1/locations/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${agencyToken}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(data)
    });

    const responseBody = await response.json();

    if (!response.ok) {
      throw Object.assign(new Error(responseBody.message || 'Failed to create subaccount'), {
        status: response.status,
        details: responseBody
      });
    }

    const locationId = responseBody.id;
    const user = await createUser(locationId, password, data);
    await loadSnapshotIntoAccount(agencyToken, locationId);
    
    return {
      "user": user,
      "location": responseBody
    };
  } catch (error: any) {
    console.error("Create SubAccount Error:", error);
    throw error;
  }
}

const createUser = async (locationId: string, password: string, data: any) => {
  try {
    const agencyToken = process.env.AGENCY_API_KEY;
    if (!agencyToken) {
      throw Object.assign(new Error("Agency API key not configured"), { status: 500 });
    }

    const url = `https://rest.gohighlevel.com/v1/users/`;
    const payload = {
      "firstName": data.firstName,
      "lastName": data.lastName,
      "email": data.email,
      "password": password,
      "phone": data.phone,
      "type": "account",
      "role": "admin",
      "locationIds": [
        locationId
      ],
      "permissions": {
        "campaignsEnabled": true,
        "campaignsReadOnly": false,
        "contactsEnabled": true,
        "workflowsEnabled": true,
        "triggersEnabled": true,
        "funnelsEnabled": true,
        "websitesEnabled": false,
        "opportunitiesEnabled": true,
        "dashboardStatsEnabled": true,
        "bulkRequestsEnabled": true,
        "appointmentsEnabled": true,
        "reviewsEnabled": true,
        "onlineListingsEnabled": true,
        "phoneCallEnabled": true,
        "conversationsEnabled": true,
        "assignedDataOnly": false,
        "adwordsReportingEnabled": false,
        "membershipEnabled": false,
        "facebookAdsReportingEnabled": false,
        "attributionsReportingEnabled": false,
        "settingsEnabled": true,
        "tagsEnabled": true,
        "leadValueEnabled": true,
        "marketingEnabled": true
      }
    };

    // Basic validation
    if (!data.email || !data.firstName) {
      throw Object.assign(new Error("Email and firstName are required"), { status: 400 });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${agencyToken}`,
        Version: '2021-07-28',
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseBody = await response.json();

    if (!response.ok) {
      throw Object.assign(new Error(responseBody.message || 'Failed to create user'), {
        status: response.status,
        details: responseBody
      });
    }

    return responseBody;
  } catch (error: any) {
    console.error("Create User Error:", error);
    throw error;
  }
}

const loadSnapshotIntoAccount = async (token: string, locationId: string) => {
  try {
    const snapshotId = process.env.SNAPSHOT_ID || 'Y5EDypqp6IRP3QhoWGL4';
    const url = `https://rest.gohighlevel.com/v1/locations/${locationId}/load-snapshot/${snapshotId}`;

    if (!token) {
      throw Object.assign(new Error("Authentication token is required"), { status: 401 });
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Version: '2021-07-28',
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        "override": false
      })
    });

    const responseBody = await response.json();
    
    if (!response.ok) {
      const errorMessage = responseBody?.message || responseBody?.msg || 'Failed to load snapshot';
      throw Object.assign(new Error(errorMessage), {
        status: response.status,
        details: responseBody
      });
    }

    return responseBody;
  } catch (error: any) {
    console.error('Snapshot load error:', error);
    throw error;
  }
}