import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

async function checkAdminAccess(request: NextRequest): Promise<boolean> {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
        const token = authHeader.substring(7);
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        if (error || !user) return false;
        const { data: profile } = await supabaseAdmin
            .from('users_profile')
            .select('role')
            .eq('id', user.id)
            .single();
        return profile?.role === 'Admin';
    } catch {
        return false;
    }
}

function toMondayISO(dStr: string): string {
    const d = new Date(dStr);
    const day = d.getUTCDay();
    const diff = (day + 6) % 7;
    const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    m.setUTCDate(m.getUTCDate() - diff);
    return m.toISOString().slice(0, 10);
}

export async function POST(req: NextRequest) {
    try {
        const isAdmin = await checkAdminAccess(req);
        if (!isAdmin) return NextResponse.json({ error: 'Access denied. Admin role required.' }, { status: 403 });

        const body = await req.json();
        const { school_id, class_id, section_id, week_start } = body as { school_id: string; class_id: string; section_id: string; week_start: string };
        if (!school_id || !class_id || !section_id || !week_start) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }
        const mondayISO = toMondayISO(week_start);

        const { error } = await supabaseAdmin
            .from('timetable')
            .delete()
            .eq('school_id', school_id)
            .eq('class_id', class_id)
            .eq('section_id', section_id)
            .eq('week_start', mondayISO);

        if (error) {
            console.error('clear-week delete error:', error);
            return NextResponse.json({ error: 'Failed to clear week' }, { status: 500 });
        }
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('POST /api/timetable/clear-week error:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}


