import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

async function checkAdminAccess(request: NextRequest): Promise<boolean> {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return false;
        }
        const token = authHeader.substring(7);
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        if (error || !user) {
            return false;
        }
        const { data: profile } = await supabaseAdmin
            .from('users_profile')
            .select('role')
            .eq('id', user.id)
            .single();
        return profile?.role === 'Admin';
    } catch (error) {
        console.error('Error checking admin access:', error);
        return false;
    }
}

const FIXED_SCHOOL_ID = 'f27cf87b-d3fb-41c1-8f23-0558c222768d';

// POST /api/teachers - Create teacher and send magic link
export async function POST(request: NextRequest) {
    try {
        const isAdmin = await checkAdminAccess(request);
        if (!isAdmin) {
            return NextResponse.json(
                { error: 'Access denied. Admin role required.' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const {
            email,
            first_name,
            last_name
        } = body as {
            email: string;
            first_name: string;
            last_name: string;
        };

        if (!email || !first_name || !last_name) {
            return NextResponse.json(
                { error: 'Email, first name, and last name are required' },
                { status: 400 }
            );
        }

        // Check if a teacher already exists with same email for the school
        const { data: existing } = await supabaseAdmin
            .from('teachers')
            .select('id, email')
            .eq('school_id', FIXED_SCHOOL_ID)
            .ilike('email', email)
            .maybeSingle();

        if (existing) {
            return NextResponse.json(
                { error: 'Teacher with this email already exists' },
                { status: 409 }
            );
        }

        const { data: teacher, error: insertError } = await supabaseAdmin
            .from('teachers')
            .insert({
                school_id: FIXED_SCHOOL_ID,
                email,
                first_name,
                last_name
            })
            .select('*')
            .single();

        if (insertError) {
            console.error('Error inserting teacher:', insertError);
            return NextResponse.json(
                { error: 'Failed to create teacher record' },
                { status: 500 }
            );
        }

        const { error: magicLinkError } = await supabaseAdmin.auth.signInWithOtp({
            email,
            options: {
                shouldCreateUser: true,
                emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/?mode=set-password`,
                data: {
                    role: 'Teacher',
                    teacher_id: teacher.id
                }
            }
        });

        if (magicLinkError) {
            console.error('Error sending teacher magic link:', magicLinkError);
        }

        return NextResponse.json({
            success: true,
            teacher,
            magicLinkSent: !magicLinkError,
            message: magicLinkError
                ? 'Teacher created successfully, but magic link failed to send'
                : 'Teacher created successfully and magic link sent'
        });
    } catch (error) {
        console.error('Error in teacher creation:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// GET /api/teachers - List teachers with search + pagination
export async function GET(request: NextRequest) {
    try {
        const isAdmin = await checkAdminAccess(request);
        if (!isAdmin) {
            return NextResponse.json(
                { error: 'Access denied. Admin role required.' },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const search = searchParams.get('q') || searchParams.get('search') || '';
        const status = searchParams.get('status') || '';

        let query = supabaseAdmin
            .from('teachers')
            .select('*', { count: 'exact' })
            .eq('school_id', FIXED_SCHOOL_ID);

        if (search) {
            query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
        }
        if (status) {
            query = query.eq('status', status);
        }

        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.range(from, to).order('created_at', { ascending: false });

        const { data: teachers, error, count } = await query;
        if (error) {
            console.error('Error fetching teachers:', error);
            return NextResponse.json({ error: 'Failed to fetch teachers' }, { status: 500 });
        }

        return NextResponse.json({
            teachers,
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching teachers:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}


