import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// GET /api/holidays/range?school_id=...&start=YYYY-MM-DD&end=YYYY-MM-DD
// Returns holidays overlapping the given [start, end] date window (inclusive)
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const schoolId = searchParams.get('school_id');
        const start = searchParams.get('start');
        const end = searchParams.get('end');
        if (!schoolId || !start || !end) {
            return NextResponse.json({ error: 'school_id, start, and end are required' }, { status: 400 });
        }

        // Overlap condition: start_date <= end AND (end_date IS NULL OR end_date >= start)
        let query = supabaseAdmin
            .from('holidays')
            .select('id, title, is_multi_day, start_date, end_date, type, description')
            .eq('school_id', schoolId)
            .lte('start_date', end)
            .or(`end_date.is.null,end_date.gte.${start}`)
            .order('start_date', { ascending: true });

        const { data, error } = await query;
        if (error) {
            console.error('GET /api/holidays/range error:', error);
            return NextResponse.json({ error: 'Failed to fetch holidays' }, { status: 500 });
        }
        return NextResponse.json({ holidays: data ?? [] });
    } catch (e) {
        console.error('GET /api/holidays/range exception:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}


