import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

function toMondayISO(dStr: string): string {
    const d = new Date(dStr);
    if (Number.isNaN(d.getTime())) return dStr; // let DB error surface if invalid
    const day = d.getUTCDay(); // 0..6 (Sun..Sat)
    const diff = (day + 6) % 7; // Mon->0
    const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    m.setUTCDate(m.getUTCDate() - diff);
    return m.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const schoolId = searchParams.get('school_id');
        const classId = searchParams.get('class_id');
        const sectionId = searchParams.get('section_id');
        const weekStartParam = searchParams.get('week_start');
        if (!schoolId || !classId || !sectionId || !weekStartParam) {
            return NextResponse.json({ error: 'school_id, class_id, section_id, week_start are required' }, { status: 400 });
        }

        const mondayISO = toMondayISO(weekStartParam);

        const { data, error } = await supabaseAdmin
            .from('timetable')
            .select('day_of_week, period_no, teacher_id, start_time, end_time, notes')
            .eq('school_id', schoolId)
            .eq('class_id', classId)
            .eq('section_id', sectionId)
            .eq('week_start', mondayISO)
            .order('day_of_week', { ascending: true })
            .order('period_no', { ascending: true });

        if (error) {
            console.error('GET timetable error:', error);
            return NextResponse.json({ error: 'Failed to fetch timetable' }, { status: 500 });
        }

        return NextResponse.json({ week_start: mondayISO, entries: data ?? [] });
    } catch (e) {
        console.error('GET /api/timetable error:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}


