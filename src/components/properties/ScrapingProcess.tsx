import React from "react";
import { CheckCircleIcon, XCircleIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

interface ScrapingProgressProps {
  isScraping: boolean;
  progressPercentage: number;
  successCount: number;
  failureCount: number;
  currentStatus: string;
  setIsScraping: (isScraping: boolean) => void;
}

export default function ScrapingProgress({
  isScraping,
  progressPercentage,
  successCount,
  failureCount,
  currentStatus,
  setIsScraping,
}: ScrapingProgressProps) {
  if (!isScraping) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4">
          <h3 className="text-xl font-semibold flex items-center">
            <ArrowPathIcon className={`h-5 w-5 mr-2 ${progressPercentage < 100 ? "animate-spin" : ""}`} />
            Property Scraping
          </h3>
        </div>
        
        {/* Progress indicators */}
        <div className="p-6">
          <div className="mb-6">
            <div className="mb-2 flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Progress</span>
              <span className="text-sm font-bold bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                {progressPercentage}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
          
          {/* Status cards */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Success card */}
            <div className="bg-green-50 border border-green-100 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                <h4 className="font-medium text-green-800">Successful</h4>
              </div>
              <div className="text-2xl font-bold text-green-600">{successCount}</div>
              <div className="text-xs text-green-700 mt-1">Properties scraped</div>
            </div>
            
            {/* Failed card */}
            <div className="bg-red-50 border border-red-100 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <XCircleIcon className="h-5 w-5 text-red-500 mr-2" />
                <h4 className="font-medium text-red-800">Failed</h4>
              </div>
              <div className="text-2xl font-bold text-red-600">{failureCount}</div>
              <div className="text-xs text-red-700 mt-1">Properties failed</div>
            </div>
          </div>
          
          {/* Current status */}
          <div className="mb-6">
            <div className="text-sm font-medium text-gray-700 mb-2">Current Status:</div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700">
              {currentStatus || "Processing..."}
            </div>
          </div>
          
          {/* Action button */}
          <div className="flex justify-end">
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium 
                ${progressPercentage < 100 
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                  : "bg-blue-600 text-white hover:bg-blue-700 transition-colors"}`}
              onClick={() => setIsScraping(false)}
              disabled={progressPercentage < 100}
            >
              {progressPercentage < 100 ? "Processing..." : "View Results"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}