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

async function authUser(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.substring(7);
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    return user ?? null;
}

export async function GET(req: NextRequest) {
    try {
        const user = await authUser(req);
        if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const weekStartParam = searchParams.get('week_start') || new Date().toISOString().slice(0, 10);
        const mondayISO = toMondayISO(weekStartParam);

        // Resolve student by email (or users_profile link if present)
        const { data: student } = await supabaseAdmin
            .from('students')
            .select('id, school_id, class_id, section_id')
            .eq('email', user.email)
            .maybeSingle();
        if (!student) return NextResponse.json({ week_start: mondayISO, entries: [] });

        // Fetch timetable for student's class & section
        const { data, error } = await supabaseAdmin
            .from('timetable')
            .select('day_of_week, period_no, start_time, end_time, classes(name), sections(name), teachers(first_name,last_name)')
            .eq('school_id', student.school_id)
            .eq('class_id', student.class_id)
            .eq('section_id', student.section_id)
            .eq('week_start', mondayISO)
            .order('day_of_week', { ascending: true })
            .order('period_no', { ascending: true });
        if (error) {
            console.error('GET /api/timetable/for-student error:', error);
            return NextResponse.json({ error: 'Failed to fetch timetable' }, { status: 500 });
        }
        return NextResponse.json({ week_start: mondayISO, entries: data ?? [] });
    } catch (e) {
        console.error('GET /api/timetable/for-student exception:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}


