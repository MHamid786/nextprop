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
    const { limit, days, zipCode, propertyTypes } = await req.json();

    if (!zipCode) {
      throw new Error("Please provide a valid zipcode");
    }

    const searchURLs =  await redfinSearchScraper(zipCode, days, propertyTypes, API_TOKEN, limit);

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

const redfinSearchScraper = async (zipCode: string, daysOnMarket: string, propertyTypes: string, API_TOKEN: string, limit: number) => {

  const API_URL = 'https://api.apify.com/v2/acts/fSNRlNbcFgtHBFBE9/runs';

  const payload = {
    maxItems: limit,
    "zoomIn": true,
    searchUrls: [
      {
        url: `https://www.redfin.com/zipcode/${zipCode}/filter/min-days-on-market=${daysOnMarket}`,
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
      .map((item: any) => item.url)
      .filter(Boolean);

    console.log(`[RedfinSearchScraper] filteredSearchResults: ${JSON.stringify(filteredSearchResults)} [redfinSearchScraper]`)
    return filteredSearchResults;
  } catch (error) {
    console.error('Error in Zillow search scraper:', error);
    throw error;
  }
};

const mock = async (zipCode: string, daysOnMarket: string, propertyTypes: string, API_TOKEN: string, limit: number) => {
  return [
    "https://www.redfin.com/FL/Miami/1725-NW-19th-St-33125/home/42711515", "https://www.redfin.com/FL/Mims/3245-Keith-Ln-32754/home/122403872"
  ]
}