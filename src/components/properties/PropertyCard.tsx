import React from "react";
import { ZillowProperty } from "@/types/properties";
import { 
  HomeIcon, 
  PhoneIcon, 
  UserIcon, 
  CalendarIcon, 
  MapPinIcon,
  CurrencyDollarIcon
} from "@heroicons/react/24/outline";
import Image from "next/image";

interface PropertyCardProps {
  property: ZillowProperty;
  onClick: (property: ZillowProperty) => void;
}

export default function PropertyCard({ property, onClick }: PropertyCardProps) {
  // Format price with commas
  const formatPrice = (price: string | null | undefined) => {
    if (!price) return "N/A";
    const numericPrice = Number(price);
    return isNaN(numericPrice) 
      ? price 
      : numericPrice.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  };

  // Extract bedrooms and bathrooms
  const getBedBaths = () => {
    const beds = property.bedrooms ? `${property.bedrooms} bed` : null;
    const baths = property.bathrooms ? `${property.bathrooms} bath` : null;
    
    if (beds && baths) return `${beds} • ${baths}`;
    if (beds) return beds;
    if (baths) return baths;
    return "N/A";
  };

  return (
    <div 
      className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
      onClick={() => onClick(property)}
    >
      {/* Image Section */}
      <div className="relative h-48 w-full bg-blue-50">
        {property.imageUrl ? (
          <img 
            src={property.imageUrl} 
            alt={property.streetAddress || "Property"} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <img 
              src="/images/house-placeholder.svg" 
              alt="Property" 
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
          {property.homeType || "SINGLE_FAMILY"}
        </div>
      </div>

      {/* Property Details */}
      <div className="p-4">
        <div className="flex justify-between items-start mb-1">
          <div className="text-lg font-semibold text-gray-900">{formatPrice(property.price)}</div>
          {property.zestimate && (
            <div className="text-xs text-gray-500">
              Zestimate: {formatPrice(property.zestimate)}
            </div>
          )}
        </div>

        <div className="text-sm text-gray-600 mb-2">
          {getBedBaths()}
        </div>

        <div className="text-sm text-gray-800 mb-3 truncate">
          {property.streetAddress}, {property.city || "N/A"}, {property.state || "N/A"} {property.zipcode || ""}
        </div>

        {/* Agent Info */}
        <div className="border-t border-gray-100 pt-3 mt-3">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-2">
              <UserIcon className="h-4 w-4 text-gray-500" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">
                {property.agentName || property.brokerName || "N/A"}
              </div>
              <div className="text-xs text-gray-500 flex items-center">
                <PhoneIcon className="h-3 w-3 mr-1" />
                {property.agentPhoneNumber || property.brokerPhoneNumber || "N/A"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 