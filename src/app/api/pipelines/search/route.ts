import { getAuthHeaders } from "@/lib/enhancedApi";
import { refreshTokenIdBackend } from "@/utils/authUtils";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const pipelineId = searchParams.get('pipelineId') || undefined;
    const stageId = searchParams.get('stageId') || undefined;

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const startAfter = searchParams.get('startAfter') || undefined;
    const startAfterId = searchParams.get('startAfterId') || undefined;

    if (!pipelineId) {
        return NextResponse.json(
            { error: true, message: 'Pipeline ID is required' },
            { status: 400 }
        );
    }

    const pagination: PaginationParams = {
        page,
        limit,
        stageId,
        startAfter,
        startAfterId,
    };

    const data = await getOpportunitiesById(pipelineId, pagination);
    return NextResponse.json(data);

}

interface PaginationParams {
    page: number;
    limit: number;
    stageId?: string;
    startAfter?: string;
    startAfterId?: string;

}
const getOpportunitiesById = async (id: string, pagination: PaginationParams) => {
    const { token, locationId } = await getAuthHeaders();
    const tokenId = (await refreshTokenIdBackend()).id_token;

    const headers = {
        "sec-ch-ua-platform": "\"macOS\"",
        "Referer": "https://app.gohighlevel.com/",
        "sec-ch-ua": "\"Chromium\";v=\"134\", \"Not:A-Brand\";v=\"24\", \"Google Chrome\";v=\"134\"",
        "token-id": tokenId,
        "sec-ch-ua-mobile": "?0",
        "baggage": "sentry-environment=production,sentry-release=f2826d075248388b7b6107346b6ed9175fb01709,sentry-public_key=c67431ff70d6440fb529c2705792425f,sentry-trace_id=0e7eca86f2d8410cada33c5a980abe72",
        "sentry-trace": "0e7eca86f2d8410cada33c5a980abe72-a9be93e3d239db4c",
        "source": "WEB_USER",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "channel": "APP",
        "Content-Type": "application/json",
        "DNT": "1", 
        "Version": "2021-07-28",
      };
    
      const body = JSON.stringify({
        sort: [{ field: "name", direction: "desc" }],
        query: "",
        locationId: locationId,
        additionalDetails: {
          notes: true,
          tasks: true,
          calendarEvents: true,
          unReadConversations: true
        },
        filters: [
          { field: "pipeline_id", operator: "eq", value: id},
          { field: "status", operator: "eq", value: ["open"] },
          { field: "pipeline_stage_id", operator: "eq", value: pagination.stageId }
        ],
        limit: 100,
        page: pagination.page,
      });

    const url = `https://services.leadconnectorhq.com/opportunities/search?locationId=${locationId}`;
    // const options = {
    //     method: 'POST',
    //     headers: {
    //         "accept": "application/json, text/plain, */*",
    //         "accept-language": "en-US,en;q=0.9",
    //         "baggage": "sentry-environment=production,sentry-release=f2826d075248388b7b6107346b6ed9175fb01709,sentry-public_key=c67431ff70d6440fb529c2705792425f,sentry-trace_id=d9884ac9a5ea4f96aef6fca6cf7a50d1",
    //         "channel": "APP",
    //         "developer_version": "",
    //         "dnt": "1",
    //         "origin": "https://app.gohighlevel.com",
    //         "priority": "u=1, i",
    //         "referer": "https://app.gohighlevel.com/",
    //         "sec-ch-ua": `"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"`,
    //         "sec-ch-ua-mobile": "?0",
    //         "sec-ch-ua-platform": `"macOS"`,
    //         "sec-fetch-dest": "empty",
    //         "sec-fetch-mode": "cors",
    //         "sec-fetch-site": "cross-site",
    //         "sentry-trace": "d9884ac9a5ea4f96aef6fca6cf7a50d1-934a48adcea46c8a",
    //         "source": "WEB_USER",
    //         "token-id": tokenId,
    //         "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
    //         "Version": "2021-07-28",
    //     },
    //     body: JSON.stringify(body)
    // };

    const response = await fetch(url, {
        method: 'POST',
        headers,
        body
    });
    const data = await response.json();
    return data;
};