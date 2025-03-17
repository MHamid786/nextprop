import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const API_TOKEN = process.env.APIFY_API_TOKEN;
  if (!API_TOKEN) {
    console.error("API_TOKEN is not set in environment variables");
    return NextResponse.json(
      { success: false, error: "Server configuration error" },
      { status: 500 }
    );
  }

  try {
    const { query, limit } = await req.json();

    if (!query) {
      throw new Error("Please provide a valid address or query");
    }
    
    const searchURLs = await zillowSearchScraper(query, API_TOKEN, limit);

    console.log(`[SearchURLS]: ${JSON.stringify(searchURLs)}`);
    return NextResponse.json({
      success: true,
      urls: searchURLs,
    });


  } catch (error) {
    console.error("Error running Apify Actor:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

const zillowSearchScraper = async (q: string, API_TOKEN: string, limit: number) => {
  const API_URL = 'https://api.apify.com/v2/acts/X46xKaa20oUA1fRiP/runs';

  function buildZillowUSAURL(query: string, sortBy = "days", daysOnZillow = 90) {
    const usaBounds = {
      west: -125.0,
      east: -66.9,
      south: 24.4,
      north: 49.4
    };

    const searchQueryState = {
      isMapVisible: true,
      mapBounds: usaBounds,
      usersSearchTerm: query,
      filterState: {
        sort: { value: sortBy },
        tow: { value: false },
        mf: { value: false },
        con: { value: false },
        land: { value: false },
        apa: { value: false },
        manu: { value: false },
        apco: { value: false },
        doz: { value: daysOnZillow }
      },
      isListVisible: true,
      mapZoom: 12
    };
    return searchQueryState;
  }

  const encodedQuery = encodeURIComponent(JSON.stringify(buildZillowUSAURL(q)));
  const payload = {
    extractionMethod: "MAP_MARKERS",
    maxItems: limit,
    maxTotalChargeUsd: 0.02,
    searchUrls: [
      {
        url: `https://www.zillow.com/homes/for_sale/?searchQueryState=${encodedQuery}`,
        method: "GET"
      }
    ]
  };

  try {
    const runResponse = await fetch(`${API_URL}?token=${API_TOKEN}&maxItems=${limit ?? 2}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload)
    });

    if (!runResponse.ok) {
      const errorText = await runResponse.text();
      throw new Error(`Run failed with status: ${runResponse.status} - ${errorText}`);
    }

    const runData = await runResponse.json();
    const runId = runData.data.id;

    let runStatus;
    do {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const statusResponse = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${API_TOKEN}`
      );

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        throw new Error(`Status check failed: ${statusResponse.status} - ${errorText}`);
      }

      runStatus = await statusResponse.json();
    } while (runStatus.data.status === "RUNNING" || runStatus.data.status === "READY");

    if (runStatus.data.status !== "SUCCEEDED") {
      throw new Error(`Run failed with status: ${runStatus.data.status}`);
    }

    const datasetId = runStatus.data.defaultDatasetId;
    const itemsResponse = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${API_TOKEN}`
    );

    if (!itemsResponse.ok) {
      const errorText = await itemsResponse.text();
      throw new Error(`Failed to fetch items: ${itemsResponse.status} - ${errorText}`);
    }

    const items = await itemsResponse.json();
    console.log(`Fetched from Search URLs`, JSON.stringify(items));

    const filteredSearchResults = items
      .map((item) => item.detailUrl)
      .filter(Boolean);

    console.log(`[zillowSearchScraper] filteredSearchResults: ${JSON.stringify(filteredSearchResults)} [zillowSearchScraper]`)
    return filteredSearchResults;
  } catch (error) {
    console.error('Error in Zillow search scraper:', error);
    throw error;
  }
};