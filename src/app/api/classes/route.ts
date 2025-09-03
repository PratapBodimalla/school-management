import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';

// GET /api/classes - List classes
export async function GET(request: NextRequest) {
    try {
        // For now, we'll rely on the client-side role guard
        // In production, you should implement proper server-side authentication
        // This could involve checking JWT tokens or using Supabase auth helpers

        const schoolId = 'f27cf87b-d3fb-41c1-8f23-0558c222768d';

        // Fetch classes with sections
        const { data: classes, error: classesError } = await supabaseAdmin
            .from('classes')
            .select('id, name, created_at, updated_at')
            .eq('school_id', schoolId)
            .order('name', { ascending: true });

        if (classesError) {
            console.error('Error fetching classes:', classesError);
            return NextResponse.json({ error: 'Failed to fetch classes' }, { status: 500 });
        }

        // Fetch sections for each class
        const classIds = classes.map(c => c.id);
        const { data: sections, error: sectionsError } = await supabaseAdmin
            .from('sections')
            .select('id, class_id, name')
            .in('class_id', classIds);

        if (sectionsError) {
            console.error('Error fetching sections:', sectionsError);
            return NextResponse.json({ error: 'Failed to fetch sections' }, { status: 500 });
        }

        // Group sections by class_id
        const sectionsMap: Record<string, string[]> = {};
        sections.forEach(s => {
            if (!sectionsMap[s.class_id]) {
                sectionsMap[s.class_id] = [];
            }
            sectionsMap[s.class_id].push(s.name);
        });

        // Combine classes with their sections
        const result = classes.map(cls => ({
            id: cls.id,
            name: cls.name,
            school_id: schoolId,
            sections: (sectionsMap[cls.id] || []).sort(),
            created_at: cls.created_at,
            updated_at: cls.updated_at
        }));

        return NextResponse.json(result);

    } catch (error) {
        console.error('Error in GET /api/classes:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/classes - Create a class
export async function POST(request: NextRequest) {
    try {
        // For now, we'll rely on the client-side role guard
        // In production, you should implement proper server-side authentication

        const body = await request.json();
        const { name, sections = [] } = body;
        const school_id = 'f27cf87b-d3fb-41c1-8f23-0558c222768d';

        // Validation
        if (!name || !name.trim()) {
            return NextResponse.json({ error: 'Class name is required' }, { status: 400 });
        }

        const className = name.trim();

        // Check for uniqueness per school
        const { data: existingClass, error: checkError } = await supabaseAdmin
            .from('classes')
            .select('id')
            .eq('school_id', school_id)
            .eq('name', className)
            .maybeSingle();

        if (checkError) {
            console.error('Error checking class uniqueness:', checkError);
            return NextResponse.json({ error: 'Failed to validate class name' }, { status: 500 });
        }

        if (existingClass) {
            return NextResponse.json({
                error: `Class "${className}" already exists in this school`
            }, { status: 409 });
        }

        // Create class
        const { data: newClass, error: createError } = await supabaseAdmin
            .from('classes')
            .insert({
                school_id,
                name: className
            })
            .select('id, name, created_at, updated_at')
            .single();

        if (createError) {
            console.error('Error creating class:', createError);
            return NextResponse.json({ error: 'Failed to create class' }, { status: 500 });
        }

        // Create sections if provided
        if (sections.length > 0) {
            const sectionData = sections.map((sectionName: string) => ({
                class_id: newClass.id,
                name: sectionName.trim()
            }));

            const { error: sectionsError } = await supabaseAdmin
                .from('sections')
                .insert(sectionData);

            if (sectionsError) {
                console.error('Error creating sections:', sectionsError);
                // Note: We don't fail the entire operation if sections fail
                // The class is still created
            }
        }

        // Return the created class with sections
        const result = {
            id: newClass.id,
            name: newClass.name,
            school_id,
            sections: sections.map((s: string) => s.trim()),
            created_at: newClass.created_at,
            updated_at: newClass.updated_at
        };

        return NextResponse.json(result, { status: 201 });

    } catch (error) {
        console.error('Error in POST /api/classes:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
