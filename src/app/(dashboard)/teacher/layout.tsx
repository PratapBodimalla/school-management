"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useRoleGuard } from "@/lib/roleGuard";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PanelLeftClose, PanelLeftOpen, LayoutDashboard, CalendarClock, Users, CheckSquare, Sun, Moon, LogOut, Loader2 } from "lucide-react";
import type { SVGProps, ComponentType } from "react";
import type { User as SupaUser } from "@supabase/supabase-js";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
    const { loading, isAuthorized } = useRoleGuard("Teacher");
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [navLoading, setNavLoading] = useState(false);
    const [user, setUser] = useState<SupaUser | null>(null);
    const [displayName, setDisplayName] = useState<string>('Teacher');

    useEffect(() => { if (typeof window !== "undefined" && window.innerWidth >= 768) setSidebarOpen(true); }, []);
    useEffect(() => {
        const saved = localStorage.getItem('teacherSidebarCollapsed');
        if (saved) setSidebarCollapsed(JSON.parse(saved));
    }, []);
    useEffect(() => { localStorage.setItem('teacherSidebarCollapsed', JSON.stringify(sidebarCollapsed)); }, [sidebarCollapsed]);

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark' || savedTheme === 'light') setTheme(savedTheme as 'light' | 'dark');
        else setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    }, []);
    useEffect(() => { theme === 'dark' ? document.documentElement.classList.add('dark') : document.documentElement.classList.remove('dark'); }, [theme]);
    useEffect(() => { setNavLoading(true); const t = setTimeout(() => setNavLoading(false), 400); return () => clearTimeout(t); }, [pathname]);

    useEffect(() => { (async () => { const { data: { user } } = await supabase.auth.getUser(); if (user) setUser(user); })(); }, []);
    useEffect(() => {
        (async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user?.id) {
                    const { data: teacherRow } = await supabase
                        .from('teachers')
                        .select('first_name,last_name')
                        .eq('user_id', user.id)
                        .maybeSingle();
                    const nameFromTeacher = teacherRow ? `${teacherRow.first_name ?? ''} ${teacherRow.last_name ?? ''}`.trim() : '';
                    const nameFromMeta = (user.user_metadata?.first_name && user.user_metadata?.last_name)
                        ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
                        : (user.user_metadata?.full_name as string | undefined);
                    const fallback = user.email || 'Teacher';
                    const finalName = nameFromTeacher || nameFromMeta || fallback;
                    setDisplayName(String(finalName));
                }
            } catch { setDisplayName('Teacher'); }
        })();
    }, []);

    async function handleSignOut() { await supabase.auth.signOut(); router.replace('/'); }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        );
    }
    if (!isAuthorized) return null;

    return (
        <div className="min-h-screen grid" style={{ gridTemplateColumns: `${sidebarOpen ? (sidebarCollapsed ? '80px' : '240px') : '0px'} 1fr` }}>
            <aside id="sidebar" className={`border-r border-black/10 dark:border-white/10 ${sidebarCollapsed ? 'p-2' : 'p-4'} overflow-hidden ${sidebarOpen ? 'opacity-100' : 'opacity-0'} flex flex-col transition-all duration-200 ease-in-out`} aria-hidden={!sidebarOpen}>
                <div className={`flex items-center ${sidebarCollapsed ? 'justify-center mb-4' : 'justify-between mb-6'}`}>
                    <Link href="/" className="block">
                        <img src="/sloka-international-school-logo.png" alt="Sloka" className={`${sidebarCollapsed ? 'w-8 h-8' : 'w-1/2 h-auto'} hover:opacity-80 transition-opacity`} />
                    </Link>
                    {!sidebarCollapsed && (
                        <Button onClick={() => setSidebarCollapsed(v => !v)} variant="ghost" size="icon" className="h-8 w-8" title="Collapse sidebar">
                            <PanelLeftClose className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                <nav className="space-y-1 text-sm flex-1">
                    <SidebarLink href="/teacher/overview" label="Overview" icon={LayoutDashboard} collapsed={sidebarCollapsed} />
                    <SidebarLink href="/teacher/timetable" label="Timetable" icon={CalendarClock} collapsed={sidebarCollapsed} />
                    <SidebarLink href="/teacher/attendance" label="Attendance" icon={CheckSquare} collapsed={sidebarCollapsed} />
                    <SidebarLink href="/teacher/students" label="Students" icon={Users} collapsed={sidebarCollapsed} />
                </nav>

                {sidebarCollapsed && (
                    <div className="mt-4 flex justify-center">
                        <Button onClick={() => setSidebarCollapsed(false)} variant="ghost" size="icon" className="h-8 w-8" title="Expand sidebar">
                            <PanelLeftOpen className="h-4 w-4" />
                        </Button>
                    </div>
                )}

                {/* User Profile Section */}
                {user && (
                    <div className="border-t border-black/10 dark:border-white/10 pt-4 mt-4">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="w-full justify-start h-auto p-3">
                                    <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
                                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                                            {user.email?.charAt(0).toUpperCase() || 'T'}
                                        </div>
                                        <div className={`flex-1 min-w-0 transition-all duration-200 ${sidebarCollapsed ? 'opacity-0 pointer-events-none w-0' : 'opacity-100 w-auto'}`}>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.email || 'Teacher'}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Teacher</p>
                                        </div>
                                    </div>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="start" side="top" sideOffset={8}>
                                <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950" onClick={handleSignOut}>
                                    <LogOut className="mr-2 h-4 w-4" /> Sign out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}
            </aside>

            <main className="min-h-screen">
                <div className={`fixed top-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 transition-[opacity,width] duration-300 ${navLoading ? 'opacity-100 w-full' : 'opacity-0 w-0'}`} />
                <div className="sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-black/30 border-b border-black/10 dark:border-white/10">
                    <div className="flex items-center justify-between px-4 md:px-6 py-3">
                        <h1 className="text-sm md:text-base font-semibold">Teacher {displayName} Dashboard</h1>
                        <div className="flex items-center gap-2">
                            <Button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} variant="ghost" size="icon" className="h-8 w-8" title="Toggle theme">
                                {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="p-4 md:p-6">
                    <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
                        {children}
                    </Suspense>
                </div>
            </main>
        </div>
    );
}

function SidebarLink({ href, label, icon: Icon, collapsed }: { href: string; label: string; icon: ComponentType<SVGProps<SVGSVGElement>>; collapsed: boolean }) {
    const pathname = usePathname();
    const active = pathname === href || pathname.startsWith(href + '/');
    return (
        <Link href={href} className="block" aria-current={active ? 'page' : undefined}>
            <Button
                variant={active ? 'secondary' : 'ghost'}
                className={`w-full justify-start h-auto p-3 cursor-pointer hover:bg-muted/50 ${collapsed ? 'text-center' : 'text-left'} ${active ? 'border-l-2 border-l-blue-600 dark:border-l-blue-400' : ''}`}
                title={collapsed ? label : undefined}
            >
                <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
                    <Icon className={`h-5 w-5 flex-shrink-0 ${active ? 'text-blue-600 dark:text-blue-400' : ''}`} />
                    <span className={`transition-all duration-200 ${collapsed ? 'opacity-0 pointer-events-none w-0' : 'opacity-100 w-auto'} ${active ? 'font-semibold' : ''}`}>
                        {label}
                    </span>
                </div>
            </Button>
        </Link>
    );
}


