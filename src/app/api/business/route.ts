import { NextResponse } from 'next/server';
import { getBusinessByUserId, createBusinessForUser } from '@/lib/messaging-dashboard';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId parameter" },
        { status: 400 }
      );
    }
    
    // Check if this is almog@gaya.app's user ID
    if (userId === '1fba1611-fdc5-438b-8575-34670faafe05') {
      console.log('Special handling for almog@gaya.app user ID');
      
      // Direct database query
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('user_id', userId);
        
      if (error) {
        console.error('Error in direct business query:', error);
        return NextResponse.json({ business: null });
      }
      
      if (data && data.length > 0) {
        console.log('Found business directly:', data[0]);
        return NextResponse.json({ business: data[0] });
      } else {
        console.log('No business found directly');
      }
    }
    
    // Fall back to regular function for other users
    const business = await getBusinessByUserId(userId);
    return NextResponse.json({ business });
  } catch (error: any) {
    console.error('Error fetching business:', error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch business" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId, businessData } = await request.json();
    
    if (!userId || !businessData) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    const business = await createBusinessForUser(userId, businessData);
    return NextResponse.json({ business });
  } catch (error: any) {
    console.error('Error creating business:', error);
    return NextResponse.json(
      { error: error.message || "Failed to create business" },
      { status: 500 }
    );
  }
} 