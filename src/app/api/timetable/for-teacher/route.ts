import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

function toMondayISO(dStr: string): string {
    const d = new Date(dStr);
    const day = d.getUTCDay();
    const diff = (day + 6) % 7;
    const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    m.setUTCDate(m.getUTCDate() - diff);
    return m.toISOString().slice(0, 10);
}

async function authUserId(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.substring(7);
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    return user?.id ?? null;
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const weekStartParam = searchParams.get('week_start');
        if (!weekStartParam) return NextResponse.json({ error: 'week_start is required' }, { status: 400 });
        const mondayISO = toMondayISO(weekStartParam);

        const uid = await authUserId(req);
        if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Find teacher row for this auth user
        const { data: teacherRow } = await supabaseAdmin
            .from('teachers')
            .select('id, school_id')
            .eq('user_id', uid)
            .maybeSingle();
        if (!teacherRow) return NextResponse.json({ entries: [], week_start: mondayISO });

        const { data, error } = await supabaseAdmin
            .from('timetable')
            .select('day_of_week, period_no, start_time, end_time, notes, class_id, section_id')
            .eq('teacher_id', teacherRow.id)
            .eq('school_id', teacherRow.school_id)
            .eq('week_start', mondayISO)
            .order('day_of_week', { ascending: true })
            .order('period_no', { ascending: true });

        if (error) {
            console.error('GET /api/timetable/for-teacher error:', error);
            return NextResponse.json({ error: 'Failed to fetch teacher timetable' }, { status: 500 });
        }

        return NextResponse.json({ week_start: mondayISO, entries: data ?? [] });
    } catch (e) {
        console.error('GET /api/timetable/for-teacher exception:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}


