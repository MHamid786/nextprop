import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserDataAPI } from '@/app/api/locations/route';
import { isTokenExpired, refreshAccessToken, setAuthCookies } from '@/utils/authUtils';
 

interface UserData {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  locationId?: string;
  name?: string;
  phone?: string;
}

const log = (message: string) => {
  if (process.env.NODE_ENV !== 'production') console.log(`[Auth] ${message}`);
};

const logError = (message: string) => {
  if (process.env.NODE_ENV !== 'production') console.error(`[Auth] ${message}`);
};
 
const fetchUserData = async (): Promise<UserData | undefined> => {
  try {
    const userData = getUserDataAPI();
    return userData;
  } catch (err) {
    logError(`Failed to fetch user data: ${err instanceof Error ? err.message : String(err)}`);
  }

  return undefined;

};

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('ghl_access_token')?.value;
  const refreshToken = cookieStore.get('ghl_refresh_token')?.value;
  const tokenTimestamp = cookieStore.get('ghl_token_timestamp')?.value;
  const locationId = cookieStore.get('ghl_location_id');

  if (!accessToken) {
    log('No access token found');
    return NextResponse.json({ authenticated: false, user: null, locationData: null });
  }

  if (!tokenTimestamp || isTokenExpired(tokenTimestamp)) {
    if (!refreshToken) {
      log('Token expired/missing timestamp and no refresh token');
      return NextResponse.json({ authenticated: false, user: null, locationData: null });
    }

    try {
      log('Attempting token refresh');
      const newTokens = await refreshAccessToken(refreshToken);
      log('Token refresh successful');
      setAuthCookies(cookieStore, newTokens);

      const cookieOptions = {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
        maxAge: 60 * 60 * 12,
      };

      const userData = await fetchUserData();
      const response = NextResponse.json({
        authenticated: true,
        user: userData
      });

      response.cookies.set('ghl_access_token', newTokens.access_token, cookieOptions);
      response.cookies.set('ghl_token_timestamp', Date.now().toString(), cookieOptions);
      if (newTokens.refresh_token) {
        response.cookies.set('ghl_refresh_token', newTokens.refresh_token, cookieOptions);
      }

      return response;
    } catch (error) {
      logError(`Token refresh failed: ${error instanceof Error ? error.message : String(error)}`);
      return NextResponse.json({ authenticated: false, user: null, locationData: null });
    }
  }

  const userData = await fetchUserData();
  return NextResponse.json({
    authenticated: true,
    user: userData,
    locationData: { locationId: locationId?.value },
  });
}