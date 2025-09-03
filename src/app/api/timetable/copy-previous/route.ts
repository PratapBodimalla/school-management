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
        const prevMonday = new Date(mondayISO);
        prevMonday.setUTCDate(prevMonday.getUTCDate() - 7);
        const prevISO = prevMonday.toISOString().slice(0, 10);

        const { data: prevRows, error: fetchErr } = await supabaseAdmin
            .from('timetable')
            .select('day_of_week, period_no, teacher_id, start_time, end_time, notes')
            .eq('school_id', school_id)
            .eq('class_id', class_id)
            .eq('section_id', section_id)
            .eq('week_start', prevISO);
        if (fetchErr) {
            console.error('copy-previous fetch error:', fetchErr);
            return NextResponse.json({ error: 'Failed to fetch previous week' }, { status: 500 });
        }

        if (!prevRows || prevRows.length === 0) {
            return NextResponse.json({ success: true, copied_count: 0 });
        }

        const rows = prevRows.map(r => ({
            school_id, class_id, section_id,
            week_start: mondayISO,
            day_of_week: r.day_of_week,
            period_no: r.period_no,
            teacher_id: r.teacher_id,
            start_time: r.start_time,
            end_time: r.end_time,
            notes: r.notes ?? null,
        }));

        const { error: upErr, count } = await supabaseAdmin
            .from('timetable')
            .upsert(rows, { onConflict: 'school_id,class_id,section_id,week_start,day_of_week,period_no' });
        if (upErr) {
            console.error('copy-previous upsert error:', upErr);
            return NextResponse.json({ error: 'Failed to copy previous week' }, { status: 500 });
        }

        return NextResponse.json({ success: true, copied_count: rows.length });
    } catch (e) {
        console.error('POST /api/timetable/copy-previous error:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}


