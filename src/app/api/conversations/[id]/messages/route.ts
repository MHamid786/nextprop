import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { refreshTokenIdBackend } from '@/utils/authUtils';

// Add logging control to reduce console noise
const ENABLE_VERBOSE_LOGGING = false;

const log = (message: string, data?: any) => {
    if (ENABLE_VERBOSE_LOGGING) {
        if (data) {
            console.log(message, data);
        } else {
            console.log(message);
        }
    }
};

// Only show actual errors in console
const logError = (message: string, error?: any) => {
    console.error(message, error);
};

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = await params;
        const conversationId = id;

        if (!conversationId) {
            return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
        }

        const cookieStore = await cookies();
        const accessToken = cookieStore.get('ghl_access_token')?.value;

        if (!accessToken) {
            return NextResponse.json({ error: 'Authentication error: No access token found' }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const pageToken = searchParams.get('pageToken');

        log(`Fetching messages for conversation ${conversationId}${pageToken ? ` with pageToken ${pageToken}` : ''}`);

        const data = await getConversationMessages(conversationId, accessToken, pageToken);

        return NextResponse.json(data);
    } catch (error) {
        logError('Error fetching messages:', error);
        return NextResponse.json(
            { error: 'Internal server error', message: 'Failed to fetch messages' },
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = await params;
        const conversationId = id;

        if (!conversationId) {
            return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
        }

        const cookieStore = await cookies();
        const accessToken = cookieStore.get('ghl_access_token')?.value;

        if (!accessToken) {
            return NextResponse.json({ error: 'Authentication error: No access token found' }, { status: 401 });
        }

        const body = await request.json();
        const { text, contactId } = body;

        if (!text || text.trim() === '') {
            return NextResponse.json({ error: 'Message text is required' }, { status: 400 });
        }

        const result = await sendMessage(conversationId, text, accessToken, contactId);

        if (result.error) {
            return NextResponse.json({ error: result.error || 'Couldnt send your message' }, { status: 400 });
        }
        return NextResponse.json(result);
    } catch (error) {
        logError('Error in conversation message POST:', error);
        return NextResponse.json(
            { error: 'Internal server error', message: 'Failed to send message' },
            { status: 500 }
        );
    }
}

async function fetchMessagesByConversationId(conversationId: string, token: string, pageToken?: string | null) {
    try {
        return await fetchMessagesFromBackend(conversationId, token, pageToken);
    }
    catch (e) {
        console.log(`Failling back to usual method `, JSON.stringify(e));
        return await fetchMessagesFromAPI(conversationId, token, pageToken);
    }
}

async function fetchMessagesFromAPI(conversationId: string, token: string, pageToken?: string | null) {
    let url = `https://services.leadconnectorhq.com/conversations/${conversationId}/messages`;
    const queryParams = new URLSearchParams();
    if (pageToken) {
        queryParams.append('lastMessageId', pageToken);
    }

    const queryString = queryParams.toString();
    if (queryString) {
        url += `?${queryString}`;
    }

    const headers = {
        Authorization: `Bearer ${token}`,
        Version: '2021-04-15',
        Accept: 'application/json',
        'Content-Type': 'application/json',
    };

    const response = await fetch(url, {
        method: 'GET',
        headers,
    });

    return response;
}
async function fetchMessagesFromBackend(conversationId: string, token: string, pageToken?: string | null) {
    const tokenId = (await refreshTokenIdBackend()).id_token;
    let url = `https://services.leadconnectorhq.com/conversations/${conversationId}/messages`;
    const queryParams = new URLSearchParams();
    if (pageToken) {
        queryParams.append('lastMessageId', pageToken);
    }

    const queryString = queryParams.toString();
    if (queryString) {
        url += `?${queryString}`;
    }

    const headers = {
        accept: "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.9",
        channel: "APP",
        "developer_version": "",
        dnt: "1",
        'token-id': tokenId,
        baggage: "sentry-environment=production,sentry-release=86dd6da2d904e841613a262a22a5a8e48c10f0d8,sentry-public_key=c67431ff70d6440fb529c2705792425f,sentry-trace_id=58e01ac401b5416fb7301d9f8fe6343c,sentry-sample_rate=0.1,sentry-transaction=conversations-id-v2,sentry-sampled=false",

        "if-none-match": 'W/"1ea5-Hr1V1mBae01Fj8XIZ+5BjH3ejlg"',
        origin: "https://app.gohighlevel.com",
        priority: "u=1, i",
        referer: "https://app.gohighlevel.com/",
        "sec-ch-ua": '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        source: "WEB_USER",
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
        Version: "2021-04-15",
    };

    const response = await fetch(url, {
        method: 'GET',
        headers,
    });
 
    return response;
}

async function getConversationMessages(conversationId: string, token: string, pageToken?: string | null) {
    try {
        console.log(`WHUU`);
        const response = await fetchMessagesByConversationId(conversationId, token, pageToken);

        if (!response.ok) {
            const errorText = await response.text();
            logError(`Error fetching messages: ${response.status} - ${errorText}`);

            if (response.status === 401) {
                return { error: 'Authentication failed', message: 'Invalid or expired access token' };
            } else if (response.status === 403) {
                return { error: 'Permission denied', message: 'You do not have permission to access these messages' };
            } else if (response.status === 404) {
                return { error: 'Conversation not found', message: 'The requested conversation does not exist' };
            }

            return { error: `API error: ${response.status}`, message: errorText };
        }

        const data = await response.json();

        if (data && data.messages && Array.isArray(data.messages.messages)) {
            const sortedMessages = [...data.messages.messages].sort(
                (a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
            );
            return {
                lastMessageId: data.messages.lastMessageId,
                nextPage: data.messages.nextPage,
                messages: sortedMessages,
            };
        } else if (data && Array.isArray(data.messages)) {
            const sortedMessages = [...data.messages].sort(
                (a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
            );
            return {
                messages: sortedMessages,
                lastMessageId: data.lastMessageId || null,
                nextPage: data.nextPage || false,
            };
        } else {
            logError('Invalid response format from API');
            return { error: 'Invalid response format', message: 'Unexpected message structure from API' };
        }
    } catch (error) {
        logError('Error fetching conversation messages:', error);
        throw new Error('Failed to fetch conversation messages');
    }
}

async function sendMessage(conversationId: string, text: string, token: string, contactId?: string) {
    try {
        const url = `https://services.leadconnectorhq.com/conversations/messages`;

        const headers = {
            Authorization: `Bearer ${token}`,
            Version: '2021-04-15',
            'Content-Type': 'application/json',
            Accept: 'application/json',
        };

        const messageData = {
            type: 'SMS',
            message: text,
            conversationId,
            contactId,
            conversationProviderId: 'twilio_provider',
        };

        log(`[SendMessage] : ${JSON.stringify(messageData)}`);

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(messageData),
        });

        if (!response.ok) {
            const errorText = await response.json();
            logError(`Error sending message: ${response.status} `, JSON.stringify(errorText));
            return {
                success: false,
                error: errorText.message || errorText.msg || 'Couldnt send your message'
            }
        }

        const data = await response.json();
        return { success: true, id: data.id || `msg-${Date.now()}`, data };
    } catch (error) {
        logError('Error sending message:', error);
        throw new Error('Failed to send message');
    }
}