"use client";

import React, { useState, useEffect, use } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import CompletionMessage from "@/components/properties/CompletionMessage";
import PropertyTable from "@/components/properties/PropertyTable";
import PropertyPopup from "@/components/properties/PropertyPopup";
import ScrapingProgress from "@/components/properties/ScrapingProcess";
import { ScrapedResult, ZillowProperty } from "@/types/properties";
import SearchBarProperties from "@/components/properties/SearchBar";
import toast from "react-hot-toast";
import axios from "axios";

// Define Pipeline interface
interface Pipeline {
  id: string;
  name: string;
  stages: {
    id: string;
    name: string;
  }[];
}

let DAILY_LIMIT = parseInt(process.env.NEXT_PUBLIC_DAILY_LIMIT || "2", 10);
if (isNaN(DAILY_LIMIT) || DAILY_LIMIT <= 0) {
  console.error("Invalid NEXT_PUBLIC_DAILY_LIMIT, defaulting to 2");
  DAILY_LIMIT = 2;
}
console.log("DAILY_LIMIT in production:", DAILY_LIMIT);

export default function PropertiesPage() {
  const [searchMode, setSearchMode] = useState<"query" | "zipcode">("zipcode"); // Add this line
  const [isScraping, setIsScraping] = useState(false);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failureCount, setFailureCount] = useState(0);
  const [currentStatus, setCurrentStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("Miami");
  const [zipCodes, setZipCodes] = useState<string[]>(["33101"]);
  const [priceMin, setPriceMin] = useState<number>(500000);
  const [priceMax, setPriceMax] = useState<number>(700000);
  const [daysOnZillow, setDaysOnZillow] = useState<string>("3mo");
  const [forSaleByAgent, setForSaleByAgent] = useState<boolean>(true);
  const [forSaleByOwner, setForSaleByOwner] = useState<boolean>(false);
  const [forRent, setForRent] = useState<boolean>(false);
  const [sold, setSold] = useState<boolean>(false);
  const [scrapedProperties, setScrapedProperties] = useState<ZillowProperty[]>([]);
  const [completionMessage, setCompletionMessage] = useState<{
    title: string;
    message: string;
    actions: { label: string; href: string }[];
  } | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<ZillowProperty | null>(null);

  // Add pipeline states
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  // Get stages for the selected pipeline
  const selectedPipelineStages = pipelines.find(p => p.id === selectedPipeline)?.stages || [];

  // Fetch pipelines on mount
  useEffect(() => {
    fetchPipelines();
  }, []);

  const fetchPipelines = async () => {
    try {
      const response = await axios.get('/api/pipelines');
      const fetchedPipelines = response.data.pipelines || [];
      setPipelines(fetchedPipelines);

      // Set the first pipeline as default if there are pipelines
      if (fetchedPipelines.length > 0) {
        setSelectedPipeline(fetchedPipelines[0].id);
        setSelectedStage(fetchedPipelines[0].stages[0].id);
      }
    } catch (error) {
      toast.error('Failed to load pipelines');
    }
  };

  const getScrapedToday = () => {
    try {
      return parseInt(localStorage.getItem("scrapedToday") || "0", 10);
    } catch (e) {
      console.error("Error accessing localStorage scrapedToday:", e);
      return 0;
    }
  };

  const setScrapedToday = (value: number) => {
    try {
      localStorage.setItem("scrapedToday", value.toString());
    } catch (e) {
      console.error("Error setting localStorage scrapedToday:", e);
    }
  };

  const getScrapeDate = () => {
    try {
      return localStorage.getItem("scrapeDate") || new Date().toISOString().split("T")[0];
    } catch (e) {
      console.error("Error accessing localStorage scrapeDate:", e);
      return new Date().toISOString().split("T")[0];
    }
  };

  const setScrapeDate = (date: string) => {
    try {
      localStorage.setItem("scrapeDate", date);
    } catch (e) {
      console.error("Error setting localStorage scrapeDate:", e);
    }
  };

  const addContactsToPipeline = async (pipelineId: string, stageId: string, contacts: any[]) => {
    try {
      const results = await Promise.allSettled(
        contacts.map(async (contact: any) => {
          try {
            const response = await fetch('/api/opportunities', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                pipelineId: pipelineId,
                pipelineStageId: stageId,
                contactId: contact.id,
                status: "open",
                name: `${contact.firstName} ${contact.lastName} - ${contact.address1 ?? `${contact.street}, ${contact.city}, ${contact.state} ${contact.zipCode}`}`.trim()
              }),
            });

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            return { contact, success: true };
          } catch (error) {
            console.error(`Failed to add contact ${contact.id} to pipeline:`, error);
            return { contact, success: false, error };
          }
        })
      );

      const successful = results.filter(result => result.status === 'fulfilled' && result.value.success);
      const failed = results.filter(result => result.status === 'rejected' || !result.value.success);

      if (failed.length > 0) {
        toast.error(`${failed.length} contacts failed to add to pipeline`);
      }

      if (successful.length > 0) {
        toast.success(`${successful.length} contacts added to pipeline successfully`);
      }

      return { successful, failed };
    } catch (error) {
      console.error('Unexpected error in addContactsToPipeline:', error);
      toast.error('An unexpected error occurred while adding contacts to pipeline');
      return { successful: [], failed: contacts.map(contact => ({ contact, success: false, error })) };
    }
  };
  const handleBulkUpload = async (properties: ZillowProperty[]) => {

    try {
      const uploadResults = await Promise.all(
        properties.map(async (prop: any) => {
          try {
            const response = await axios.post('/api/contacts', transformLeadToContact(prop));
            return { success: true, contact: response.data.contact };
          } catch (error) {
            console.warn(`Failed to upload contact "${prop?.firstName || prop?.phone}":`, error);
            return { success: false, contact: null };
          }
        })
      );

      const successfulUploads = uploadResults.filter((result) => result.success);
      const processedContacts = successfulUploads.map((result) => result.contact);

      toast.success(`${successfulUploads.length} contacts added successfully`);

      if (selectedPipeline && selectedStage) {
        addContactsToPipeline(selectedPipeline, selectedStage, processedContacts);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add contacts');
    }
  };
  const transformLeadToContact = (property: ZillowProperty) => {
    const fullName = property.agentName || property.brokerName || "";
    const nameParts = fullName.split(" ");
    return {
      firstName: nameParts[0] || "",
      lastName: nameParts.slice(1).join(" ") || "",
      email: property.agentEmail || property.brokerEmail || "",
      phone: property.agentPhoneNumber || property.brokerPhoneNumber || "",
      address1: property.streetAddress || "",
      city: property.city || "",
      state: property.state || "",
      customFields: [
        {
          id: "ECqyHR21ZJnSMolxlHpU",
          key: "contact.type",
          field_value: "lead",
        },
      ],
      tags: ["scraped-lead", "zillow-property", "Review-new-lead"],
    };
  };

  const supportedDaysOnZillow = [
    '1wk', // 7 days
    '2wk', // 14 days
    '1mo', // 30 days
    '2mo', // 60 days
    '3mo', // 90 days
    '6mo', // 180 days
  ]
  const _searchByZipCodes = async (limit: number) => {

    return await fetch("/api/properties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        limit,
        zipCode: zipCodes[0],
        propertyTypes: ['house'],
        'days': daysOnZillow,
      }),
    });
  }

  const getUserLocationId = async () => {
    const response = await fetch("/api/auth/ghl/location-id");
    const data = await response.json();
    return data.locationId;
  }
  const handleScrapeProperties = async (count: number = DAILY_LIMIT) => {
    if (selectedPipeline == null || selectedStage == null) {
      toast.error("Please select a pipeline and stage");
      return;
    }
    // Initial state reset
    const resetState = () => {
      setIsScraping(true);
      setProgressPercentage(0);
      setSuccessCount(0);
      setFailureCount(0);
      setCurrentStatus("");
      setCompletionMessage(null);
      setScrapedProperties([]);
    };

    // Check and reset daily scrape count
    // Skipping daily limits for specific users
    const UNLIMITED_USERS = ['s3mNHrFuDyGiI7oUVisU', "rhJba4qZDxLza65WYvnW"];

    // Modify the checkDailyLimit function
    const checkDailyLimit = async (): Promise<number | null> => {
      const today = new Date().toISOString().split("T")[0];
      let scrapedToday = getScrapedToday();
      const storedDate = getScrapeDate();

      // Get current user email (you'll need to implement this based on your auth system)
      const userEmail = await getUserLocationId(); // Implement this function to get current user's email

      // Check if user is in unlimited list
      if (UNLIMITED_USERS.includes(userEmail)) {
        return count; // Return the requested count without daily limit check
      }

      if (storedDate !== today) {
        scrapedToday = 0;
        setScrapeDate(today);
        setScrapedToday(0);
      }

      if (scrapedToday >= DAILY_LIMIT) {
        setCompletionMessage({
          title: "Daily Limit Reached",
          message: `You've reached the daily limit of ${DAILY_LIMIT} properties. Come back tomorrow to scrape more listings!`,
          actions: [
            { label: "View Properties", href: "/properties/list" },
            { label: "View Contacts", href: "/contacts" },
          ],
        });
        return null;
      }

      return Math.min(count, DAILY_LIMIT - scrapedToday);
    };

    // Fetch properties from Zillow API
    // Fetch properties from Zillow API
    const fetchProperties = async (limit: number): Promise<ZillowProperty[]> => {

      if (zipCodes.length <= 0) {
        toast.error("No zip codes provided");
        throw new Error("No zip code(s) provided");
      }

      setCurrentStatus(`Starting to scrape ${limit} properties...`);
      const searchResponse = await _searchByZipCodes(limit);
      const searchURLbody = await searchResponse.json();
      const searchURLs = searchURLbody.urls;

      if (!searchResponse.ok || !searchURLs) {
        console.error("Search API error response:", searchURLbody);
        throw new Error(
          searchURLbody.error ||
          `Failed to scrape properties: ${searchResponse.statusText} (Status: ${searchResponse.status})`
        );
      }

      const detailResponse = await fetch("/api/properties/redfin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: searchURLs, limit }),
      });

      const data = await detailResponse.json();
      return convertToZillowProperty(data).properties || [];
    };

    const getPhoto = (photos: any) => {
      try {
        const url = photos[0].photoUrls || {};
        return url.fullScreenPhotoUrl;

      } catch (e) {
        console.error("Error getting photo:", e);
        return null;
      }
    }
    function convertToZillowProperty(mockResults: any[]): ScrapedResult {
      try {
        const properties: ZillowProperty[] = (mockResults || []).map((result = {}) => {
          const mainHouseInfo = result.mainHouseInfo || {};
          const photos = result.mediaBrowserInfo.photos || [];
          const publicRecords = result.publicRecordsInfo?.latestListingInfo || {};
          const listingAgents = Array.isArray(mainHouseInfo.listingAgents) ? mainHouseInfo.listingAgents : [];
          const listingAgent = listingAgents[0]?.agentInfo || {};
          const listingBroker = listingAgents[0] || {};
          const propertyAddress = mainHouseInfo.propertyAddress || {};

          // Safely construct street address from propertyAddress components
          const streetComponents = [
            propertyAddress.streetNumber,
            propertyAddress.directionalPrefix,
            propertyAddress.streetName,
            propertyAddress.streetType,
            propertyAddress.directionalSuffix
          ].filter(Boolean); // Remove null/undefined values
          const constructedStreetAddress = streetComponents.length > 0 ? streetComponents.join(' ').trim() : null;

          // Fallback address parsing
          const fullAddress = mainHouseInfo.fullStreetAddress || '';
          const addressParts = fullAddress.split(', ').filter(Boolean);
          const stateZip = (addressParts[2] || '').split(' ').filter(Boolean);

          return {
            agentName: listingAgent.agentName ?? null,
            agentPhoneNumber: listingBroker.brokerPhoneNumber?.phoneNumber ?? null,
            brokerName: listingBroker.brokerName ?? null,
            brokerPhoneNumber: listingBroker.brokerPhoneNumber?.phoneNumber ?? null,
            agentEmail: listingBroker.brokerEmailAddress ?? null,
            brokerEmail: listingBroker.brokerEmailAddress ?? null,
            homeType: publicRecords.propertyTypeName ?? null,
            streetAddress: constructedStreetAddress ?? mainHouseInfo.streetAddress ?? null,
            city: propertyAddress.city ?? (addressParts[1] || null),
            state: propertyAddress.stateOrProvinceCode ?? (stateZip[0] || null),
            zipcode: propertyAddress.postalCode ?? (stateZip[1] || null),
            price: null,
            listingSubType: null,
            zestimate: null,
            bedrooms: publicRecords.beds != null ? String(publicRecords.beds) : null,
            bathrooms: publicRecords.baths != null ? String(publicRecords.baths) : null,
            description: null,
            timeOnZillow: null,
            url: result.scraperInput ?? null,
            imageUrl: getPhoto(photos)
          };
        });

        return {
          success: true,
          properties: properties
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred during conversion'
        };
      }
    }
    // Process scraped properties
    const processProperties = async (properties: ZillowProperty[]) => {
      const totalProperties = properties.length;
      setSuccessCount(totalProperties);
      setScrapedProperties(properties);
      setProgressPercentage(50);

      setCurrentStatus(`Adding ${totalProperties} properties to contacts...`);
      const contactsAdded = await handleBulkUpload(properties);
      const scrapedToday = getScrapedToday() + totalProperties;
      setScrapedToday(scrapedToday);

      setProgressPercentage(100);
      setCurrentStatus(`Successfully scraped ${totalProperties} properties and added to contacts.`);

      const remaining = DAILY_LIMIT - scrapedToday;
      setCompletionMessage({
        title: "Property Scraping Complete",
        message: `${totalProperties} properties have been scraped from Zillow and based on your query: "${searchQuery}". You have ${remaining > 0 ? remaining : 0} properties left to scrape today.`,
        actions: [
          { label: "View Properties", href: "/properties/list" },
          { label: "View Contacts", href: "/contacts" },
        ],
      });
    };

    // Handle errors
    const handleError = (error: unknown) => {
      console.error("Error scraping properties:", error);
      const errorMessage = error instanceof Error ? error.message : String(error) || "An unknown error occurred";
      setFailureCount(1);
      setCurrentStatus(`Error: ${errorMessage}`);
      setCompletionMessage({
        title: "Property Scraping Failed",
        message: `Error: ${errorMessage}`,
        actions: [],
      });
    };

    // Main execution
    try {
      resetState();
      const remainingCount = await checkDailyLimit();
      if (remainingCount === null) return;
      const properties = await fetchProperties(remainingCount);
      await processProperties(properties);
    } catch (error) {
      handleError(error);
    } finally {
      setIsScraping(false);
    }
  };

  const handleRowClick = (property: ZillowProperty) => {
    setSelectedProperty(property);
  };

  const closePopup = () => {
    setSelectedProperty(null);
  };

  return (
    <DashboardLayout title="Properties">
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl shadow-lg mb-8">
          <div className="p-6 md:p-8 text-white">
            <h2 className="text-xl md:text-2xl font-bold mb-3">Scrape Zillow Properties</h2>
            <p className="mb-4">
              Enter a search query and generate up to {DAILY_LIMIT} property listings at a time from Zitllow per day
            </p>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium mb-4">Search Zillow Properties</h2>

          {/* Pipeline dropdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Pipeline Selector */}
            <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Pipeline</h3>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <select
                value={selectedPipeline || ''}
                onChange={(e) => setSelectedPipeline(e.target.value)}
                disabled={isScraping}
                className="w-full px-3 py-2 border border-gray-200 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              >
                {pipelines.length === 0 ? (
                  <option value="">Loading pipelines...</option>
                ) : (
                  pipelines.map((pipeline) => (
                    <option key={pipeline.id} value={pipeline.id} className="text-gray-700">
                      {pipeline.name}
                    </option>
                  ))
                )}
              </select>
              <p className="mt-2 text-xs text-gray-500">Select where contacts will be organized</p>
            </div>

            {/* Stage Selector */}
            <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Stage</h3>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <select
                value={selectedStage || ''}
                onChange={(e) => setSelectedStage(e.target.value)}
                disabled={isScraping || !selectedPipeline}
                className="w-full px-3 py-2 border border-gray-200 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              >
                {selectedPipelineStages.length === 0 ? (
                  <option value="">Select pipeline first</option>
                ) : (
                  selectedPipelineStages.map((stage) => (
                    <option key={stage.id} value={stage.id} className="text-gray-700">
                      {stage.name}
                    </option>
                  ))
                )}
              </select>
              <p className="mt-2 text-xs text-gray-500">Choose the stage for new contacts</p>
            </div>
          </div>

          <SearchBarProperties
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            zipCodes={zipCodes}
            setZipCodes={setZipCodes}
            priceMin={priceMin}
            setPriceMin={setPriceMin}
            priceMax={priceMax}
            setPriceMax={setPriceMax}
            daysOnZillow={daysOnZillow}
            setDaysOnZillow={setDaysOnZillow}
            forSaleByAgent={forSaleByAgent}
            setForSaleByAgent={setForSaleByAgent}
            forSaleByOwner={forSaleByOwner}
            setForSaleByOwner={setForSaleByOwner}
            forRent={forRent}
            setForRent={setForRent}
            sold={sold}
            setSold={setSold}
            isScraping={isScraping}
            handleScrapeProperties={handleScrapeProperties}
            dailyLimit={DAILY_LIMIT}
            searchMode={searchMode} // Pass searchMode
            setSearchMode={setSearchMode} // Pass setSearchMode
          />
          <CompletionMessage completionMessage={completionMessage} />
          <PropertyTable scrapedProperties={scrapedProperties} handleRowClick={handleRowClick} />
        </div>

        <PropertyPopup selectedProperty={selectedProperty} closePopup={closePopup} />
        <ScrapingProgress
          isScraping={isScraping}
          progressPercentage={progressPercentage}
          successCount={successCount}
          failureCount={failureCount}
          currentStatus={currentStatus}
          setIsScraping={setIsScraping}
        />
      </div>
    </DashboardLayout>
  );
}