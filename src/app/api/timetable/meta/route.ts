import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const schoolId = searchParams.get('school_id');
        if (!schoolId) return NextResponse.json({ error: 'school_id is required' }, { status: 400 });

        const { data: teachers, error } = await supabaseAdmin
            .from('teachers')
            .select('id, first_name, last_name')
            .eq('school_id', schoolId)
            .order('first_name', { ascending: true });
        if (error) {
            console.error('meta teachers error:', error);
            return NextResponse.json({ error: 'Failed to fetch teachers' }, { status: 500 });
        }

        const periods = [
            { period_no: 1, start_time: '08:00', end_time: '08:45' },
            { period_no: 2, start_time: '08:46', end_time: '09:30' },
            { period_no: 3, start_time: '09:31', end_time: '10:15' },
            { period_no: 4, start_time: '10:16', end_time: '10:45' },
            { period_no: 5, start_time: '10:46', end_time: '11:30' },
            { period_no: 6, start_time: '13:01', end_time: '13:45' },
            { period_no: 7, start_time: '13:46', end_time: '14:30' },
        ];

        return NextResponse.json({ teachers: teachers ?? [], periods });
    } catch (e) {
        console.error('GET /api/timetable/meta error:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}


