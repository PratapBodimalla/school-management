# Product Requirements Document – School Management

## 1. Elevator Pitch  
A cloud-based **School Managemen** that allows a school to manage students, teachers, classes, and fees on a single platform. The system provides role-based access for admins, teachers, and students with secure authentication and customizable configurations. It streamlines administration, empowers teachers with easy attendance and timetable management, and provides students with transparent access to their academic and fee records—all while ensuring scalability, security, and consistency.  

---

## 2. Who is this app for  
- **School Admins** – Configure school setup, manage classes, teachers, students, calendars, and fees.  
- **Teachers** – View schedules, mark attendance, and access class/student information.  
- **Students** – Access academic timetables, attendance, fees, and personal profiles.  
- **(Future Scope: Parents)** – Track child’s attendance, performance, and fee status.  

---

## 3. Functional Requirements  
### Core Features  
- **User Onboarding & Authentication**  
  - NextAuth with email/password and OAuth providers.  
  - Role-based access control (Admin, Teacher, Student).  
  - School-specific login links emailed upon onboarding.  

- **School Setup**  
  - Admin registration via landing page.  
  - Dashboard to configure classes, subjects, timetables, and calendars.  

- **Admin Features**  
  - Manage student and teacher profiles.  
  - Upload user lists and send invitations.  
  - Record and track fee collection.  

- **Teacher Features**  
  - View daily/weekly schedules.  
  - Mark and track attendance per period/class.  
  - Access student lists by class/section.  

- **Student Features**  
  - Manage personal profile (basic details only).  
  - View timetables, assigned teachers, and subjects.  
  - Track attendance and fee payment status.  
  - Download payment receipts.  

- **Security**  
  - Role-based authorization at resource level.  

---

## 4. User Stories  
- **Admin**  
  - As an Admin, I want to register my school so that I can manage classes, teachers, and students.  
  - As an Admin, I want to upload teacher and student lists so that the system auto-creates user accounts.  
  - As an Admin, I want to manage classes, subjects, and timetables so that academic operations run smoothly.  
  - As an Admin, I want to track fees so I can see pending and collected payments.  

- **Teacher**  
  - As a Teacher, I want to see my weekly schedule so I can plan lessons.  
  - As a Teacher, I want to mark attendance during class so student records remain updated.  
  - As a Teacher, I want to view my students’ lists so I know who is in each class.  

- **Student**  
  - As a Student, I want to log in and see my timetable so I know my subjects and teachers.  
  - As a Student, I want to check my attendance record so I can track my percentage.  
  - As a Student, I want to view my fee payment status so I know when payments are due.  

---

## 5. User Interface  
- **Landing Page** – Generic marketing page with school signup form.  
- **Admin Dashboard** – Sidebar navigation for Classes, Students, Teachers, Timetable, Fees.  
- **Teacher Dashboard** – Schedule view (day/week), quick attendance marking interface, student list view.  
- **Student Dashboard** – Clean card/grid layout with Timetable, Attendance %, Fee Status, Profile.  
- **UI Design System** – Shared component library (Shadcn UI + Tailwind) for consistency.  
- **Responsive Design** – Works across web and mobile browsers.  
