# Student Creation Flow Documentation

## Overview
This document describes the complete student creation flow implemented in the Sloka School Management System. When an admin creates a student, the system automatically creates a Supabase Auth user and sends an invitation email.

## Flow Diagram
```
Admin → Create Student → API Endpoint → Database + Auth + Email → Student Onboarding
```

## Implementation Details

### 1. API Endpoint
**Route:** `POST /api/students`

**Functionality:**
- Validates required fields (email, first_name, last_name)
- Checks for existing students and users
- Creates Supabase Auth user with role metadata
- Inserts student record into database
- Sends invitation email
- Returns comprehensive status

**Request Body:**
```json
{
  "email": "student@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "date_of_birth": "2008-05-15",
  "grade": "Grade 7",
  "section": "A",
  "parent_name": "Jane Doe",
  "parent_phone": "+1234567890",
  "address": "123 School Street"
}
```

**Response:**
```json
{
  "success": true,
  "student": { /* student object */ },
  "authUserCreated": true,
  "invitationSent": true,
  "message": "Student created successfully"
}
```

### 2. Database Schema
**Table:** `public.students`

```sql
CREATE TABLE public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    date_of_birth DATE,
    grade TEXT,
    section TEXT,
    parent_name TEXT,
    parent_phone TEXT,
    address TEXT,
    enrollment_date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Features:**
- Row Level Security (RLS) enabled
- Automatic timestamp updates
- Unique email constraint
- Comprehensive student information

### 3. Supabase Auth Integration
**User Creation:**
- Creates user with `user_metadata.role = "Student"`
- Sets `app_metadata.role = "Student"`
- Auto-confirms email for immediate access

**Invitation Email:**
- Uses Supabase Admin API to send invitation
- Redirects to `/onboarding/student?email=<email>`
- Includes role information in email data

### 4. Student Onboarding Page
**Route:** `/onboarding/student`

**Features:**
- Email pre-filled from URL parameter
- Password creation form
- Additional profile information collection
- Automatic redirect to student dashboard
- Resend invitation functionality

**Onboarding Process:**
1. Student clicks invitation link
2. Completes password setup
3. Fills additional profile information
4. Account is activated
5. Redirected to student dashboard

## Admin Interface

### Student Management Page
**Route:** `/admin/students`

**Features:**
- Create new students with comprehensive form
- View all students in table format
- Search and filter by grade/section
- Pagination support
- Real-time status updates

**Create Student Form:**
- Email and basic information
- Grade and section selection
- Parent/guardian details
- Address information
- Automatic invitation sending

## Security Features

### Row Level Security (RLS)
- **Admins:** Full access to all students
- **Teachers:** Read access to students in their classes
- **Students:** Read access to their own profile only

### Authentication
- Service role key used only server-side
- Client-side operations use anon key
- Role-based access control enforced

## Environment Variables Required

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Site Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Error Handling

### Common Error Scenarios
1. **Duplicate Email:** Returns 409 with clear message
2. **Invalid Data:** Returns 400 with validation details
3. **Auth Creation Failure:** Rolls back database changes
4. **Invitation Failure:** Logs error but doesn't fail operation

### Idempotent Operations
- If user already exists, updates metadata instead of creating
- If student already exists, returns appropriate error
- Prevents duplicate invitations

## Testing the Flow

### 1. Create Student
1. Navigate to `/admin/students`
2. Click "Add Student"
3. Fill in student information
4. Submit form
5. Verify success message and invitation sent

### 2. Student Onboarding
1. Check email for invitation
2. Click invitation link
3. Complete password setup
4. Verify redirect to student dashboard

### 3. Verification
1. Check Supabase Auth users
2. Verify user metadata contains role
3. Check students table for new record
4. Verify student can access dashboard

## Future Enhancements

### Planned Features
- Bulk student import
- Student status management
- Parent portal access
- Advanced filtering and search
- Student photo uploads
- Academic history tracking

### API Extensions
- Student update endpoints
- Student deletion (soft delete)
- Student status changes
- Bulk operations
- Export functionality

## Troubleshooting

### Common Issues
1. **Invitation not sent:** Check service role key and email settings
2. **User creation fails:** Verify Supabase project configuration
3. **Database errors:** Check table schema and RLS policies
4. **Redirect issues:** Verify NEXT_PUBLIC_SITE_URL setting

### Debug Steps
1. Check browser console for errors
2. Verify API endpoint responses
3. Check Supabase logs
4. Verify environment variables
5. Test with minimal data first

## Support
For issues or questions about the student creation flow, check:
1. Supabase project logs
2. Browser developer tools
3. API response status codes
4. Database query results
5. Authentication state
