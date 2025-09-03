import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
    // For now, let the client-side components handle role-based access
    // This middleware will be enhanced later if needed

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/admin/:path*',
        '/teacher/:path*',
        '/student/:path*'
        // Removed '/signin' since that route doesn't exist
    ]
};
