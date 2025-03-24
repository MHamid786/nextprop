import { ZillowProperty } from "@/types/properties";
import React from "react";
import { XMarkIcon, PhoneIcon, EnvelopeIcon, HomeIcon, MapPinIcon, CurrencyDollarIcon } from "@heroicons/react/24/outline";

interface PropertyPopupProps {
  selectedProperty: ZillowProperty | null;
  closePopup: () => void;
}

export default function PropertyPopup({ selectedProperty, closePopup }: PropertyPopupProps) {
  if (!selectedProperty) return null;

  // Format price with commas
  const formatPrice = (price: string | null | undefined) => {
    if (!price) return "N/A";
    const numericPrice = Number(price);
    return isNaN(numericPrice) 
      ? price 
      : numericPrice.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  };

  // Get listing type description
  const getListingType = () => {
    if (!selectedProperty.listingSubType) return "N/A";
    
    if (typeof selectedProperty.listingSubType === "string") {
      return selectedProperty.listingSubType;
    }
    
    return Object.entries(selectedProperty.listingSubType)
      .filter(([_, value]) => value === true)
      .map(([key]) => {
        const formatted = key.replace("is", "");
        return formatted.charAt(0).toUpperCase() + formatted.slice(1);
      })
      .join(", ") || "None";
  };

  // Handle opening the URL safely
  const handleOpenUrl = () => {
    if (selectedProperty.url) {
      window.open(selectedProperty.url, "_blank");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header with close button */}
        <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
          <h3 className="text-xl font-semibold">
            {selectedProperty.streetAddress || "Property Details"}
          </h3>
          <button 
            onClick={closePopup}
            className="p-1 rounded-full hover:bg-blue-700 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {/* Main content */}
          <div className="md:flex">
            {/* Property image */}
            <div className="md:w-1/2">
              <div className="h-64 md:h-full relative bg-blue-50">
                {selectedProperty.imageUrl ? (
                  <img 
                    src={selectedProperty.imageUrl} 
                    alt={selectedProperty.streetAddress || "Property"} 
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <img 
                    src="/images/house-placeholder.svg" 
                    alt="Property" 
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
                  <div className="text-white text-xl font-bold">
                    {formatPrice(selectedProperty.price)}
                  </div>
                  <div className="text-white text-sm">
                    {selectedProperty.streetAddress}, {selectedProperty.city || "N/A"}, {selectedProperty.state || "N/A"} {selectedProperty.zipcode || ""}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Property details */}
            <div className="md:w-1/2 p-6">
              <div className="flex justify-between mb-4">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{formatPrice(selectedProperty.price)}</div>
                  {selectedProperty.zestimate && (
                    <div className="text-sm text-gray-600">
                      Zestimate: {formatPrice(selectedProperty.zestimate)}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="inline-block bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded">
                    {selectedProperty.homeType || "Single Family"}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {selectedProperty.timeOnZillow || "Recently Listed"}
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-6 mb-6">
                {selectedProperty.bedrooms && (
                  <div className="text-center">
                    <div className="text-lg font-semibold">{selectedProperty.bedrooms}</div>
                    <div className="text-xs text-gray-500">Beds</div>
                  </div>
                )}
                {selectedProperty.bathrooms && (
                  <div className="text-center">
                    <div className="text-lg font-semibold">{selectedProperty.bathrooms}</div>
                    <div className="text-xs text-gray-500">Baths</div>
                  </div>
                )}
                <div className="text-center">
                  <div className="text-lg font-semibold">{getListingType()}</div>
                  <div className="text-xs text-gray-500">Listing Type</div>
                </div>
              </div>
              
              <div className="mb-6">
                <h4 className="text-lg font-semibold mb-2">About This Property</h4>
                <p className="text-gray-700 text-sm leading-relaxed max-h-32 overflow-y-auto">
                  {selectedProperty.description || "No description available."}
                </p>
              </div>
            </div>
          </div>
          
          {/* Agent and broker information */}
          <div className="border-t border-gray-200 p-6">
            <h4 className="text-lg font-semibold mb-4">Contact Information</h4>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Agent info */}
              {(selectedProperty.agentName || selectedProperty.agentPhoneNumber) && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center mb-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <HomeIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-900">Agent</h5>
                      <p className="text-sm text-gray-600">{selectedProperty.agentName || "N/A"}</p>
                    </div>
                  </div>
                  
                  {selectedProperty.agentPhoneNumber && (
                    <div className="flex items-center text-sm text-gray-700 mb-2">
                      <PhoneIcon className="h-4 w-4 mr-2 text-gray-500" />
                      {selectedProperty.agentPhoneNumber}
                    </div>
                  )}
                  
                  {selectedProperty.agentEmail && (
                    <div className="flex items-center text-sm text-gray-700">
                      <EnvelopeIcon className="h-4 w-4 mr-2 text-gray-500" />
                      {selectedProperty.agentEmail}
                    </div>
                  )}
                </div>
              )}
              
              {/* Broker info */}
              {(selectedProperty.brokerName || selectedProperty.brokerPhoneNumber) && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center mb-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <MapPinIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-900">Brokerage</h5>
                      <p className="text-sm text-gray-600">{selectedProperty.brokerName || "N/A"}</p>
                    </div>
                  </div>
                  
                  {selectedProperty.brokerPhoneNumber && (
                    <div className="flex items-center text-sm text-gray-700 mb-2">
                      <PhoneIcon className="h-4 w-4 mr-2 text-gray-500" />
                      {selectedProperty.brokerPhoneNumber}
                    </div>
                  )}
                  
                  {selectedProperty.brokerEmail && (
                    <div className="flex items-center text-sm text-gray-700">
                      <EnvelopeIcon className="h-4 w-4 mr-2 text-gray-500" />
                      {selectedProperty.brokerEmail}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Footer with action buttons */}
        <div className="border-t border-gray-200 p-4 flex justify-end space-x-3">
          {selectedProperty.url && (
            <button
              onClick={handleOpenUrl}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              View on Redfin
            </button>
          )}
          <button
            onClick={closePopup}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}