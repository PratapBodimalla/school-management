"use client";

import { useEffect, useState } from "react";
import { useRoleGuard } from "@/lib/roleGuard";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function StudentDashboardPage() {
    const { loading } = useRoleGuard("Student");
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    useEffect(() => {
        if (typeof window !== "undefined" && window.innerWidth >= 768) {
            setSidebarOpen(true);
        }
    }, []);
    async function handleSignOut() {
        await supabase.auth.signOut();
        router.replace("/");
    }
    if (loading) {
        return <div className="p-6">Loading…</div>;
    }
    return (
        <div className="min-h-screen grid" style={{ gridTemplateColumns: `${sidebarOpen ? "260px" : "0px"} 1fr` }}>
            <aside id="sidebar" className={`border-r border-black/10 dark:border-white/10 p-4 overflow-hidden ${sidebarOpen ? "opacity-100" : "opacity-0"}`} aria-hidden={!sidebarOpen}>
                <div className="font-semibold text-lg mb-6">Student</div>
                <nav className="space-y-1 text-sm">
                    <SidebarLink href="#overview" label="Overview" />
                    <SidebarLink href="#timetable" label="Timetable" />
                    <SidebarLink href="#fees" label="Fees" />
                    <SidebarLink href="#profile" label="Profile" />
                </nav>
            </aside>

            <main className="min-h-screen">
                <div className="sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-black/30 border-b border-black/10 dark:border-white/10">
                    <div className="flex items-center justify-between px-4 md:px-6 py-3">
                        <div className="flex items-center gap-3">
                            <button aria-expanded={sidebarOpen} aria-controls="sidebar" onClick={() => setSidebarOpen((v) => !v)} className="rounded-md border px-3 py-2 text-sm">Menu</button>
                            <h1 className="text-lg md:text-xl font-semibold">Student Dashboard</h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <Link href="/" className="rounded-md border px-3 py-2 text-sm">Home</Link>
                            <button className="rounded-md border px-3 py-2 text-sm">Download Receipt</button>
                            <button onClick={handleSignOut} className="rounded-md bg-black text-white dark:bg-white dark:text-black px-3 py-2 text-sm">Sign out</button>
                        </div>
                    </div>
                </div>

                <div id="overview" className="p-4 md:p-6 space-y-6">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <StatCard title="Attendance" value="—%" subtitle="This term" />
                        <StatCard title="Upcoming Class" value="—" subtitle="Next period" />
                        <StatCard title="Fees Due" value="—" subtitle="Next due date" />
                        <StatCard title="Profile" value="Complete" subtitle="Basic details" />
                    </div>

                    <section id="timetable" className="grid gap-6 lg:grid-cols-2">
                        <Panel title="Timetable">
                            <TimetablePlaceholder />
                        </Panel>
                        <Panel title="Fee Status">
                            <FeesPlaceholder />
                        </Panel>
                    </section>

                    <section id="profile" className="grid gap-6">
                        <Panel title="Profile">
                            <div className="text-sm text-black/70 dark:text-white/70">Basic details placeholder.</div>
                        </Panel>
                    </section>
                </div>
            </main>
        </div>
    );
}

function StatCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
    return (
        <div className="rounded-xl border border-black/10 dark:border-white/10 p-4">
            <div className="text-sm text-black/70 dark:text-white/70">{title}</div>
            <div className="text-2xl font-semibold mt-1">{value}</div>
            <div className="text-xs text-black/60 dark:text-white/60 mt-1">{subtitle}</div>
        </div>
    );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="rounded-xl border border-black/10 dark:border-white/10">
            <div className="px-4 py-3 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
                <h2 className="text-base font-semibold">{title}</h2>
            </div>
            <div className="p-4">{children}</div>
        </section>
    );
}

function SidebarLink({ href, label }: { href: string; label: string }) {
    return (
        <Link href={href} className="block rounded-md px-3 py-2 hover:bg-black/5 dark:hover:bg-white/10">
            {label}
        </Link>
    );
}

function TimetablePlaceholder() {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    return (
        <div className="grid sm:grid-cols-2 gap-3">
            {days.map((d) => (
                <div key={d} className="rounded-lg border border-black/10 dark:border-white/10 p-3 text-sm">
                    <div className="font-medium mb-2">{d}</div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-black/70 dark:text-white/70">—</span>
                            <span className="text-black/50 dark:text-white/50">08:00</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-black/70 dark:text-white/70">—</span>
                            <span className="text-black/50 dark:text-white/50">09:00</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function FeesPlaceholder() {
    const rows = [
        { item: "Tuition - Term 1", status: "Pending", amount: "—" },
        { item: "Lab Fee", status: "Paid", amount: "—" },
    ];
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-left text-black/70 dark:text-white/70">
                        <th className="py-2 pr-3">Item</th>
                        <th className="py-2 pr-3">Status</th>
                        <th className="py-2 pr-3">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r, i) => (
                        <tr key={i} className="border-t border-black/10 dark:border-white/10">
                            <td className="py-2 pr-3">{r.item}</td>
                            <td className="py-2 pr-3">{r.status}</td>
                            <td className="py-2 pr-3">{r.amount}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}


