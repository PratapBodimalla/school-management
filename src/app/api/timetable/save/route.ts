import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

async function checkAdminAccess(request: NextRequest): Promise<{ ok: boolean; userId?: string }> {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) return { ok: false };
        const token = authHeader.substring(7);
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        if (error || !user) return { ok: false };
        const { data: profile } = await supabaseAdmin
            .from('users_profile')
            .select('role')
            .eq('id', user.id)
            .single();
        return { ok: profile?.role === 'Admin', userId: user.id };
    } catch (e) {
        console.error('checkAdminAccess error:', e);
        return { ok: false };
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
        const access = await checkAdminAccess(req);
        if (!access.ok) return NextResponse.json({ error: 'Access denied. Admin role required.' }, { status: 403 });

        const body = await req.json();
        const { school_id, class_id, section_id, week_start, entries } = body as {
            school_id: string; class_id: string; section_id: string; week_start: string;
            entries: Array<{ day_of_week: number; period_no: number; teacher_id: string | null; start_time: string; end_time: string; notes?: string | null }>;
        };

        if (!school_id || !class_id || !section_id || !week_start || !Array.isArray(entries)) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const mondayISO = toMondayISO(week_start);

        const rows = [] as any[];
        for (const e of entries) {
            if (e.day_of_week < 1 || e.day_of_week > 7) {
                return NextResponse.json({ error: 'day_of_week must be between 1 and 7' }, { status: 400 });
            }
            if (!/^\d{2}:\d{2}$/.test(e.start_time) || !/^\d{2}:\d{2}$/.test(e.end_time)) {
                return NextResponse.json({ error: 'Invalid time format' }, { status: 400 });
            }
            if (e.end_time <= e.start_time) {
                return NextResponse.json({ error: 'end_time must be greater than start_time' }, { status: 400 });
            }
            rows.push({
                school_id, class_id, section_id,
                week_start: mondayISO,
                day_of_week: e.day_of_week,
                period_no: e.period_no,
                teacher_id: e.teacher_id,
                notes: e.notes ?? null,
                start_time: e.start_time,
                end_time: e.end_time,
                created_by: access.userId,
            });
        }

        const { error } = await supabaseAdmin
            .from('timetable')
            .upsert(rows, {
                onConflict: 'school_id,class_id,section_id,week_start,day_of_week,period_no',
                ignoreDuplicates: false
            });

        if (error) {
            console.error('timetable save error:', error);
            return NextResponse.json({ error: 'Failed to save timetable' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('POST /api/timetable/save error:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}


