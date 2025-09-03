import { supabase } from "@/lib/supabaseClient";

// Helper function to get the current session token
export async function getAuthToken(): Promise<string | null> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token || null;
    } catch (error) {
        console.error('Error getting auth token:', error);
        return null;
    }
}

// Helper function to make authenticated API calls
export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const token = await getAuthToken();

    // Normalize headers to a plain object so we can safely add Authorization
    const normalizedHeaders: Record<string, string> = {};
    const incoming = options.headers as HeadersInit | undefined;
    if (incoming instanceof Headers) {
        incoming.forEach((value, key) => { normalizedHeaders[key] = value; });
    } else if (Array.isArray(incoming)) {
        incoming.forEach(([key, value]) => { normalizedHeaders[key] = value; });
    } else if (incoming && typeof incoming === 'object') {
        Object.assign(normalizedHeaders, incoming as Record<string, string>);
    }

    if (!normalizedHeaders['Content-Type']) {
        normalizedHeaders['Content-Type'] = 'application/json';
    }

    if (token) {
        normalizedHeaders['Authorization'] = `Bearer ${token}`;
    }

    return fetch(url, {
        ...options,
        headers: normalizedHeaders,
    });
}
