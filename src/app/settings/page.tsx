"use client";

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { UserIcon, ArrowRightOnRectangleIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';

export default function SettingsPage() {
   const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [locationData, setLocationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLocationData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/locations', { method: 'GET' });

        if (!response.ok) {
          throw new Error('Failed to fetch location data');
        }

        const data = await response.json();
        console.log(`[Location]: ${JSON.stringify(data)}`);
        setLocationData(data.data); // Set to data.data since response wraps everything in "data"
      } catch (error) {
        console.error('Error fetching location data:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLocationData();
  }, []);

  const handleLogout = () => {
    setIsLoggingOut(true);
    setTimeout(() => {
      logout();
    }, 500);
  };

  // Function to format field names (e.g., camelCase to Title Case)
  const formatFieldName = (key:any) => {
    return key
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
      .trim();
  };

  // Fields to exclude from display
  const excludedFields = ['id', 'companyId', 'settings', 'social', 'business', 'dateAdded', 'automaticMobileAppInvite'];

  // Separate account and business fields dynamically
  const renderFields = (data: any, isBusiness = false) => {
    if (!data) return null;
    
    const fields = Object.entries(data)
      .filter(([key]) => !excludedFields.includes(key))
      .map(([key, value]) => {
        // Skip if value is an object or null/empty
        if (typeof value === 'object' || value === null || value === '') return null;
        
        return (
          <div key={key}>
            <h3 className="text-sm font-medium text-gray-700">{formatFieldName(key)}</h3>
            <p className="mt-1 text-gray-900">
              {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value.toString()}
            </p>
          </div>
        );
      })
      .filter(Boolean);

    return fields.length > 0 ? fields : <p className="text-gray-500">No {isBusiness ? 'business' : 'account'} data available</p>;
  };

  return (
    <DashboardLayout title="Settings">
      <div className="max-w-3xl mx-auto">
        <div className="nextprop-card mb-6">
          {/* Account Information */}
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h2>
          
          <div className="flex items-start space-x-3 mb-6">
            <div className="h-12 w-12 bg-[#7c3aed] rounded-full flex items-center justify-center text-white">
              <UserIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900">
                {user?.name || (locationData && locationData.firstName && locationData.lastName) 
                  ? user?.name ?? `${locationData.firstName} ${locationData.lastName}`
                   : 'Loading...'}
              </p>
              <p className="text-gray-500">
                {((user?.email ?? locationData?.email)) || 'Loading...'}
              </p>
            </div>
          </div>

          {loading ? (
            <p className="text-gray-500">Loading account data...</p>
          ) : error ? (
            <p className="text-red-500">Error: {error}</p>
          ) : locationData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderFields(locationData)}
            </div>
          ) : (
            <p className="text-gray-500">No account data available</p>
          )}

          {/* Business Information */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Business Information</h2>
            {loading ? (
              <p className="text-gray-500">Loading business data...</p>
            ) : error ? (
              <p className="text-red-500">Error: {error}</p>
            ) : locationData?.business ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderFields(locationData.business, true)}
              </div>
            ) : (
              <p className="text-gray-500">No business data available</p>
            )}
          </div>

          {/* Bulk Actions Section */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Bulk Actions</h2>
            <p className="text-gray-500 mb-4">View and manage your bulk operations history</p>
            <a 
              href="/bulk-actions" 
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#7c3aed] hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              <ClipboardDocumentCheckIcon className="h-5 w-5 mr-2" />
              Manage Bulk Actions
            </a>
          </div>

          {/* Logout Button */}
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingOut ? (
                'Logging out...'
              ) : (
                <>
                  <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
                  Log out
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}