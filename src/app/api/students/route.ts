import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Helper function to check if user is admin
async function checkAdminAccess(request: NextRequest): Promise<boolean> {
    try {
        // Get the authorization header
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return false;
        }

        const token = authHeader.substring(7);

        // Verify the JWT token and get user info
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

        if (error || !user) {
            return false;
        }

        // Check if user has admin role in users_profile table
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

// POST endpoint to create a new student
export async function POST(request: NextRequest) {
    try {
        // First verify the user has admin access
        const isAdmin = await checkAdminAccess(request);
        if (!isAdmin) {
            return NextResponse.json(
                { error: 'Access denied. Admin role required.' },
                { status: 403 }
            );
        }

        // Extract student details from request body
        const body = await request.json();
        const {
            email,
            first_name,
            last_name,
            class_id,
            section
        } = body as {
            email: string;
            first_name: string;
            last_name: string;
            class_id: string;
            section: string;

        };

        // Validate required basics
        if (!email || !first_name || !last_name) {
            return NextResponse.json(
                { error: 'Email, first name, and last name are required' },
                { status: 400 }
            );
        }
        if (!class_id) {
            return NextResponse.json(
                { error: 'class_id is required' },
                { status: 400 }
            );
        }

        // Check for existing student with same email
        const { data: existingStudent } = await supabaseAdmin
            .from('students')
            .select('id, email')
            .eq('email', email)
            .single();

        if (existingStudent) {
            return NextResponse.json(
                { error: 'Student with this email already exists' },
                { status: 409 }
            );
        }

        // Insert student record in students table
        const { data: student, error: insertError } = await supabaseAdmin
            .from('students')
            .insert({
                school_id: FIXED_SCHOOL_ID,
                email,
                first_name,
                last_name,
                class_id,
                section_id: section
            })
            .select()
            .single();

        if (insertError) {
            console.error('Error inserting student:', insertError);
            return NextResponse.json(
                { error: 'Failed to create student record' },
                { status: 500 }
            );
        }

        // Send magic link email to student instead of invite
        const { error: magicLinkError } = await supabaseAdmin.auth.signInWithOtp({
            email,
            options: {
                shouldCreateUser: true,
                emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/?mode=set-password`,
                data: {
                    role: 'Student',
                    student_id: student.id
                }
            }
        });

        if (magicLinkError) {
            console.error('Error sending magic link:', magicLinkError);
            // Don't fail the operation if email fails, just log it
        }

        return NextResponse.json({
            success: true,
            student,
            magicLinkSent: !magicLinkError,
            message: magicLinkError
                ? 'Student created successfully, but magic link failed to send'
                : 'Student created successfully and magic link sent'
        });

    } catch (error) {
        console.error('Error in student creation:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// GET endpoint to fetch students with filtering and pagination
export async function GET(request: NextRequest) {
    try {
        // Verify admin access
        const isAdmin = await checkAdminAccess(request);
        if (!isAdmin) {
            return NextResponse.json(
                { error: 'Access denied. Admin role required.' },
                { status: 403 }
            );
        }

        // Extract query parameters
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const search = searchParams.get('q') || searchParams.get('search') || '';
        const classId = searchParams.get('class_id') || '';
        const sectionId = searchParams.get('section_id') || '';

        // Build query with filters, always scoping to fixed school
        let query = supabaseAdmin
            .from('students')
            .select('*', { count: 'exact' })
            .eq('school_id', FIXED_SCHOOL_ID);

        // Apply search and filters
        if (search) {
            query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
        }
        if (classId) {
            query = query.eq('class_id', classId);
        }
        if (sectionId) {
            query = query.eq('section_id', sectionId);
        }

        // Apply pagination
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.range(from, to).order('created_at', { ascending: false });

        // Execute query
        const { data: students, error, count } = await query;

        if (error) {
            console.error('Error fetching students:', error);
            return NextResponse.json(
                { error: 'Failed to fetch students' },
                { status: 500 }
            );
        }

        // Return paginated results
        return NextResponse.json({
            students,
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit)
            }
        });

    } catch (error) {
        console.error('Error fetching students:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
