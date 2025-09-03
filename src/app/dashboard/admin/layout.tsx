"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useRoleGuard } from "@/lib/roleGuard";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { User, Settings, HelpCircle, LogOut, PanelLeftClose, PanelLeftOpen, LayoutDashboard, GraduationCap, Users, BookOpen, Calendar, Clock, Sun, Moon } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { loading, isAuthorized } = useRoleGuard("admin");
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [theme, setTheme] = useState<'light' | 'dark'>('light');


    useEffect(() => {
        if (typeof window !== "undefined" && window.innerWidth >= 768) {
            setSidebarOpen(true);
        }
    }, []);

    useEffect(() => {
        // Load sidebar collapsed state from localStorage
        const savedState = localStorage.getItem('sidebarCollapsed');
        if (savedState !== null) {
            setSidebarCollapsed(JSON.parse(savedState));
        }
    }, []);

    useEffect(() => {
        // Load theme preference from localStorage
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark' || savedTheme === 'light') {
            setTheme(savedTheme);
        } else {
            // Check system preference if no saved theme
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            setTheme(prefersDark ? 'dark' : 'light');
        }
    }, []);

    useEffect(() => {
        // Apply theme to document when theme changes
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    useEffect(() => {
        async function getUser() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUser(user);
            }
        }
        getUser();
    }, []);

    async function handleSignOut() {
        await supabase.auth.signOut();
        router.replace("/");
    }

    function toggleSidebarCollapse() {
        const newState = !sidebarCollapsed;
        setSidebarCollapsed(newState);
        localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
    }

    function toggleTheme() {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);

        // Apply theme to document
        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading admin dashboard...</p>
                </div>
            </div>
        );
    }

    if (!isAuthorized) {
        return null; // Will redirect via role guard
    }

    return (
        <div className="min-h-screen grid" style={{ gridTemplateColumns: `${sidebarOpen ? (sidebarCollapsed ? "80px" : "260px") : "0px"} 1fr` }}>
            <aside id="sidebar" className={`border-r border-black/10 dark:border-white/10 ${sidebarCollapsed ? "p-2" : "p-4"} overflow-hidden ${sidebarOpen ? "opacity-100" : "opacity-0"} flex flex-col transition-all duration-200 ease-in-out`} aria-hidden={!sidebarOpen}>
                <div className={`flex items-center ${sidebarCollapsed ? 'justify-center mb-4' : 'justify-between mb-6'}`}>
                    <Link href="/dashboard/admin/overview" className="block">
                        <img
                            src="/sloka-international-school-logo.png"
                            alt="Sloka International School"
                            className={`cursor-pointer hover:opacity-80 transition-opacity ${sidebarCollapsed ? 'w-8 h-8' : 'w-1/2 h-auto'
                                }`}
                        />
                    </Link>

                    {/* Collapse Toggle Button */}
                    {!sidebarCollapsed && (
                        <Button
                            onClick={toggleSidebarCollapse}
                            aria-pressed={sidebarCollapsed}
                            aria-label="Collapse sidebar"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Collapse sidebar"
                        >
                            <PanelLeftClose className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                <nav className="space-y-1 text-sm flex-1">
                    <SidebarLink href="/dashboard/admin/overview" label="Overview" icon={LayoutDashboard} collapsed={sidebarCollapsed} />
                    <SidebarLink href="/dashboard/admin/classes" label="Classes" icon={GraduationCap} collapsed={sidebarCollapsed} />
                    <SidebarLink href="/dashboard/admin/students" label="Students" icon={Users} collapsed={sidebarCollapsed} />
                    <SidebarLink href="/dashboard/admin/teachers" label="Teachers" icon={BookOpen} collapsed={sidebarCollapsed} />
                    <SidebarLink href="/dashboard/admin/holidays" label="Holidays" icon={Calendar} collapsed={sidebarCollapsed} />
                    <SidebarLink href="/dashboard/admin/timetable" label="Timetable" icon={Clock} collapsed={sidebarCollapsed} />
                </nav>

                {/* Expand Button for Collapsed State */}
                {sidebarCollapsed && (
                    <div className="mt-4 flex justify-center">
                        <Button
                            onClick={toggleSidebarCollapse}
                            aria-label="Expand sidebar"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Expand sidebar"
                        >
                            <PanelLeftOpen className="h-4 w-4" />
                        </Button>
                    </div>
                )}

                {/* User Profile Section */}
                {user && (
                    <div className="border-t border-black/10 dark:border-white/10 pt-4 mt-4">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="w-full justify-start h-auto p-3"
                                >
                                    <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
                                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                                            {user.email?.charAt(0).toUpperCase() || 'A'}
                                        </div>
                                        <div className={`flex-1 min-w-0 transition-all duration-200 ${sidebarCollapsed ? 'opacity-0 pointer-events-none w-0' : 'opacity-100 w-auto'
                                            }`}>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                {user.email || 'Admin User'}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Administrator</p>
                                        </div>
                                    </div>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                className="w-56"
                                align="start"
                                side="top"
                                sideOffset={8}
                            >
                                <DropdownMenuItem className="cursor-pointer">
                                    <User className="mr-2 h-4 w-4" />
                                    Profile
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer">
                                    <Settings className="mr-2 h-4 w-4" />
                                    Settings
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer">
                                    <HelpCircle className="mr-2 h-4 w-4" />
                                    Help
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950"
                                    onClick={handleSignOut}
                                >
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Sign out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}
            </aside>

            <main className="min-h-screen">
                <div className="sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-black/30 border-b border-black/10 dark:border-white/10">
                    <div className="flex items-center justify-end px-4 md:px-6 py-3">
                        {/* Theme Toggle Button */}
                        <Button
                            onClick={toggleTheme}
                            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
                        >
                            {theme === 'light' ? (
                                <Moon className="h-5 w-5" />
                            ) : (
                                <Sun className="h-5 w-5" />
                            )}
                        </Button>
                    </div>
                </div>

                <div className="p-4 md:p-6">
                    {children}
                </div>
            </main>


        </div>
    );
}

function SidebarLink({ href, label, icon: Icon, collapsed }: { href: string; label: string; icon: any; collapsed: boolean }) {
    return (
        <Link href={href} className="block">
            <Button
                variant="ghost"
                className={`w-full justify-start h-auto p-3 ${collapsed ? 'text-center' : 'text-left'
                    }`}
                title={collapsed ? label : undefined}
            >
                <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className={`transition-all duration-200 ${collapsed ? 'opacity-0 pointer-events-none w-0' : 'opacity-100 w-auto'
                        }`}>
                        {label}
                    </span>
                </div>
            </Button>
        </Link>
    );
}


