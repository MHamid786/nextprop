import React, { useState } from "react";
import { MagnifyingGlassIcon, ArrowPathIcon, UserPlusIcon, FunnelIcon } from "@heroicons/react/24/outline";

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  zipCodes: string[];
  setZipCodes: (zipCodes: string[]) => void;
  priceMin: number;
  setPriceMin: (price: number) => void;
  priceMax: number;
  setPriceMax: (price: number) => void;
  daysOnZillow: string;
  setDaysOnZillow: (days: string) => void;
  forSaleByAgent: boolean;
  setForSaleByAgent: (value: boolean) => void;
  forSaleByOwner: boolean;
  setForSaleByOwner: (value: boolean) => void;
  forRent: boolean;
  setForRent: (value: boolean) => void;
  sold: boolean;
  setSold: (value: boolean) => void;
  isScraping: boolean;
  handleScrapeProperties: (count: number) => void;
  dailyLimit: number;
  searchMode: "query" | "zipcode";
  setSearchMode: (mode: "query" | "zipcode") => void;
}

export default function SearchBarProperties({
  searchQuery,
  setSearchQuery,
  zipCodes,
  setZipCodes,
  priceMin,
  setPriceMin,
  priceMax,
  setPriceMax,
  daysOnZillow,
  setDaysOnZillow,
  forSaleByAgent,
  setForSaleByAgent,
  forSaleByOwner,
  setForSaleByOwner,
  forRent,
  setForRent,
  sold,
  setSold,
  isScraping,
  handleScrapeProperties,
  dailyLimit,
  searchMode,
  setSearchMode,
}: SearchBarProps) {
  const [showFilters, setShowFilters] = useState(true);
  const [priceError, setPriceError] = useState<string | null>(null); // State for validation error

  const handleSearchModeToggle = (mode: "query" | "zipcode") => {
    setSearchMode(mode);
    if (mode === "query") {
      setZipCodes([]);
      setShowFilters(false);
    }
    if (mode === "zipcode") {
      setSearchQuery("");
    }
  };

  // Validation function for price range
  const validatePriceRange = (min: number, max: number) => {
    if (min < 0 || max < 0) {
      setPriceError("Prices cannot be negative");
      return false;
    }
    if (min > max && max !== 0) { // Allow max to be 0 (unbounded)
      setPriceError("Max price must be greater than min price");
      return false;
    }
    setPriceError(null); // Clear error if valid
    return true;
  };

  // Handle price min change with validation
  const handlePriceMinChange = (value: number) => {
    setPriceMin(value);
    validatePriceRange(value, priceMax);
  };

  // Handle price max change with validation
  const handlePriceMaxChange = (value: number) => {
    setPriceMax(value);
    validatePriceRange(priceMin, value);
  };

  // Override scrape handler to include validation
  const handleScrapeWithValidation = () => {
    if (validatePriceRange(priceMin, priceMax)) {
      handleScrapeProperties(dailyLimit);
    }
  };

  return (
    <div className="mb-6">
      <div className="flex flex-col gap-4">
        {/* Search Mode Toggle */}
        {/* <div className="flex gap-2 mb-2">
          <button
            onClick={() => handleSearchModeToggle("query")}
            className={`px-4 py-2 rounded-md ${searchMode === "query" ? "bg-purple-700 text-white" : "bg-gray-200 text-gray-700"}`}
            disabled={isScraping}
          >
            Search by Query
          </button>
          <button
            onClick={() => handleSearchModeToggle("zipcode")}
            className={`px-4 py-2 rounded-md ${searchMode === "zipcode" ? "bg-purple-700 text-white" : "bg-gray-200 text-gray-700"}`}
            disabled={isScraping}
          >
            Search by Zip Code
          </button>
        </div> */}

        {/* Main Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          {searchMode === "query" ? (
            <div className="relative flex-grow w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full rounded-md border-0 py-3 pl-10 pr-4 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
                placeholder="e.g., Miami, FL"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={isScraping}
              />
            </div>
          ) : (
            <div className="flex-grow w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">Zip Codes</label>
              <input
                type="text"
                placeholder="e.g., 33101, 33102"
                value={zipCodes.join(", ")}
                onChange={(e) => setZipCodes(e.target.value.split(", ").map((z) => z.trim()))}
                disabled={isScraping}
                className="w-full rounded-md border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600"
              />
            </div>
          )}
          <div className="flex gap-2">
            {searchMode === "zipcode" && (
              <button
                onClick={() => setShowFilters(!showFilters)}
                disabled={isScraping}
                className="flex items-center gap-2 py-3 px-4 rounded-lg shadow-sm text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-300"
              >
                <FunnelIcon className="h-5 w-5" />
                Filters
              </button>
            )}
            <button
              onClick={handleScrapeWithValidation}
              disabled={isScraping || !!priceError} // Disable if scraping or validation error
              className={`flex items-center justify-center gap-2 py-3 px-6 rounded-lg shadow-sm text-white font-medium ${
                isScraping || priceError ? "bg-gray-500" : "bg-purple-700 hover:bg-purple-800"
              }`}
            >
              {isScraping ? (
                <>
                  <ArrowPathIcon className="h-5 w-5 animate-spin" />
                  Scraping...
                </>
              ) : (
                <>
                  <UserPlusIcon className="" />
                  Scrape {dailyLimit} Properties
                </>
              )}
            </button>
          </div>
        </div>

        {/* Collapsible Filters Panel - Only show in zipcode mode */}
        {searchMode === "zipcode" && showFilters && (
          <div className="bg-gray-50 p-4 rounded-lg shadow-inner">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Advanced Filters</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Price Range
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price Range</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={priceMin}
                    onChange={(e) => handlePriceMinChange(Number(e.target.value))}
                    disabled={isScraping}
                    className={`w-full rounded-md border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ${
                      priceError ? "ring-red-500" : "ring-gray-300"
                    } focus:ring-2 focus:ring-blue-600`}
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={priceMax}
                    onChange={(e) => handlePriceMaxChange(Number(e.target.value))}
                    disabled={isScraping}
                    className={`w-full rounded-md border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ${
                      priceError ? "ring-red-500" : "ring-gray-300"
                    } focus:ring-2 focus:ring-blue-600`}
                  />
                </div>
                {priceError && <p className="text-red-500 text-sm mt-1">{priceError}</p>}
              </div> */}

              {/* Days on Zillow */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Days on Zillow</label>
                <select
                  value={daysOnZillow}
                  onChange={(e) => setDaysOnZillow(e.target.value)}
                  disabled={isScraping}
                  className="w-full rounded-md border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600"
                >
                  <option value="1wk">Last 7 days</option>
                  <option value="1mo">Last 30 days</option>
                  <option value="3mo">Last 90 days</option>
                  <option value="6mo">Last 180 days</option>
                </select>
              </div>
            </div>

            {/* Listing Status
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Listing Status</label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={forSaleByAgent}
                    onChange={(e) => setForSaleByAgent(e.target.checked)}
                    disabled={isScraping}
                    className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">For Sale (Agent)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={forSaleByOwner}
                    onChange={(e) => setForSaleByOwner(e.target.checked)}
                    disabled={isScraping}
                    className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">For Sale (Owner)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={forRent}
                    onChange={(e) => setForRent(e.target.checked)}
                    disabled={isScraping}
                    className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">For Rent</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={sold}
                    onChange={(e) => setSold(e.target.checked)}
                    disabled={isScraping}
                    className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Sold</span>
                </label>
              </div>
            </div> */}
          </div>
        )}
      </div>
    </div>
  );
}