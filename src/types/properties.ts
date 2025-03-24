export interface ListingSubType {
    isFSBA?: boolean;
    isFSBO?: boolean;
    isPending?: boolean;
    isNewHome?: boolean;
    isForeclosure?: boolean;
    isBankOwned?: boolean;
    isForAuction?: boolean;
    isOpenHouse?: boolean;
    isComingSoon?: boolean;
  }
  
  export interface ZillowProperty {
    agentName?: string | null;
    agentPhoneNumber?: string | null;
    brokerName?: string | null;
    brokerPhoneNumber?: string | null;
    agentEmail?: string | null;
    brokerEmail?: string | null;
    homeType?: string | null;
    streetAddress?: string | null;
    city?: string | null;
    state?: string | null;
    zipcode?: string | null;
    price?: string | null;
    listingSubType?: string | ListingSubType | null;
    zestimate?: string | null;
    bedrooms?: string | null;
    bathrooms?: string | null;
    description?: string | null;
    timeOnZillow?: string | null;
    url?: string | null;
    imageUrl?: string | null;
  }
  
  export interface ScrapedResult {
    success: boolean;
    properties?: ZillowProperty[];
    error?: string;
  }