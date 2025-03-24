import { NextResponse } from "next/server";


export async function POST(req: Request) {
    const rawJson = await req.json();
    const { limit } = rawJson; 
    const API_TOKEN = process.env.APIFY_API_TOKEN; 
    // const data = await mockRedinScraper(API_TOKEN, limit, rawJson);
    const data = await redfinScraper(API_TOKEN, limit, rawJson);
    return NextResponse.json(data);
}

/**
 * Search by zip code but with redfin filters
 */

const redfinScraper = async (API_TOKEN: string, limit: number, payload: any) => {
    const API_URL = 'https://api.apify.com/v2/acts/O4t1ic2ZC0CNiRPR3/runs';

    /// delete null or empty values from payload
    for (const key in payload) {
        if (payload[key] === null || payload[key] === '') {
            delete payload[key];
        }
    }

    const urls = payload.urls; 
    const agentPayload = {
        "detailUrls": urls.map((url: string) => {
            return {
                "url": url,
                "method": "GET"
            }
        }),
        "searchResultsDatasetId": ""
    }
    try {
        const runResponse = await fetch(`${API_URL}?token=${API_TOKEN}&maxItems=${limit ?? 2}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(agentPayload)
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

        return await itemsResponse.json();
    } catch (error) {
        console.error('Error in Zillow search scraper:', error);
        throw error;
    }
};

const mockRedinScraper = async (API_TOKEN: string, limit: number, payload: any) => {

const mockSearchResults = [
    {
        "scraperInput": "https://www.redfin.com/AL/Huntsville/4113-Toftoy-Dr-SW-35805/home/125779794",
        "publicRecordsInfo": {   
            "latestListingInfo": {
                "beds": 3,
                "baths": 1.5,
                "totalSqFt": 1171,
                "lotSqFt": 10018,
                "numStories": 1,
                "propertyTypeName": "Single Family Residential",
                "yearBuilt": 1958
            }, 
        }, 
        "price": {
            "value": 479900,
            "level": 1
        },
        "mainHouseInfo": { 
            "listingAgents": [
                {
                    "agentInfo": {
                        "agentName": "Alexis King",
                        "isAgentNameBlank": false,
                        "isRedfinAgent": false,
                        "isPartnerAgent": false,
                        "isExternalAgent": false
                    },
                    "brokerName": "Keller Williams Realty",
                    "brokerPhoneNumber": {
                        "phoneNumber": "256-519-7220",
                        "displayLevel": 1
                    },
                    "brokerEmailAddress": "robertsimons@kw.com",
                    "isOpendoor": false
                }
            ],
            "buyingAgents": [
                {
                    "agentInfo": {
                        "agentName": "Joe Dawicki",
                        "isAgentNameBlank": false,
                        "isRedfinAgent": false,
                        "isPartnerAgent": false,
                        "isExternalAgent": false
                    },
                    "brokerName": "Matt Curtis Real Estate, Inc.",
                    "brokerPhoneNumber": {
                        "phoneNumber": "256-270-9393",
                        "displayLevel": 1
                    },
                    "brokerEmailAddress": "info@mattcurtisrealestate.com",
                    "isOpendoor": false
                }
            ],   
            "timezone": "US/Central",
            "streetAddress": "4113 Toftoy Dr SW",
            "fullStreetAddress": "4113 Toftoy Dr SW, Huntsville, AL 35805",
            "propertyAddress": {
                "streetNumber": "4113",
                "directionalPrefix": "",
                "streetName": "Toftoy",
                "streetType": "Dr",
                "directionalSuffix": "SW",
                "unitType": "",
                "unitValue": "",
                "city": "Huntsville",
                "stateOrProvinceCode": "AL",
                "postalCode": "35805",
                "countryCode": "US"
            },
        },    
    }, 
]
    return mockSearchResults;
}

const buildRedfinFilterURL = (payload: any) =>{ 
    let propertyTypes = payload.propertyTypes;
    let minDaysOnMarket = payload.minDaysOnMarket; 
    let zipCode = payload.zipCode;
    return `https://www.redfin.com/zipcode/${zipCode}/filter/property-type=${propertyTypes},min-days-on-market=${minDaysOnMarket}`;

}