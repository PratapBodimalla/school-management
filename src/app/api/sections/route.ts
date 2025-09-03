import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// GET /api/sections - List sections
// Optional query: class_id to filter sections by class
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const classId = searchParams.get('class_id') || '';

        let query = supabaseAdmin
            .from('sections')
            .select('id, name, class_id')
            .order('name', { ascending: true });

        if (classId) {
            query = query.eq('class_id', classId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching sections:', error);
            return NextResponse.json({ error: 'Failed to fetch sections' }, { status: 500 });
        }

        return NextResponse.json({
            sections: (data || []).map((s: { id: string; name: string; class_id: string }) => ({
                id: s.id,
                name: s.name,
                class_id: s.class_id,
            }))
        });
    } catch (err) {
        console.error('Error in GET /api/sections:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
