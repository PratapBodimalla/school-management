"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useRoleGuard } from "@/lib/roleGuard";

export default function TeacherDashboardPage() {
    const { loading } = useRoleGuard("Teacher");
    const router = useRouter();
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
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
                <div className="font-semibold text-lg mb-6">Teacher</div>
                <nav className="space-y-1 text-sm">
                    <SidebarLink href="#overview" label="Overview" />
                    <SidebarLink href="#schedule" label="Today's Schedule" />
                    <SidebarLink href="#attendance" label="Attendance" />
                    <SidebarLink href="#students" label="Students" />
                </nav>
            </aside>

            <main className="min-h-screen">
                <div className="sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-black/30 border-b border-black/10 dark:border-white/10">
                    <div className="flex items-center justify-between px-4 md:px-6 py-3">
                        <div className="flex items-center gap-3">
                            <button aria-expanded={sidebarOpen} aria-controls="sidebar" onClick={() => setSidebarOpen((v) => !v)} className="rounded-md border px-3 py-2 text-sm">Menu</button>
                            <h1 className="text-lg md:text-xl font-semibold">Teacher Dashboard</h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <Link href="/" className="rounded-md border px-3 py-2 text-sm">Home</Link>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="rounded-md border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/30 dark:focus:ring-white/30"
                            />
                            <button onClick={handleSignOut} className="rounded-md bg-black text-white dark:bg-white dark:text-black px-3 py-2 text-sm">Sign out</button>
                        </div>
                    </div>
                </div>

                <div id="overview" className="p-4 md:p-6 space-y-6">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <InfoCard title="Today's Classes" value="0" subtitle="Scheduled periods" />
                        <InfoCard title="Pending Attendance" value="0" subtitle="Periods to submit" />
                        <InfoCard title="Students" value="0" subtitle="Across assigned sections" />
                    </div>

                    <section id="schedule" className="grid gap-6 lg:grid-cols-2">
                        <Panel title="Today's Schedule">
                            <ScheduleTable />
                        </Panel>
                        <Panel title="Quick Attendance">
                            <AttendanceQuickForm />
                        </Panel>
                    </section>

                    <section id="students" className="grid gap-6">
                        <Panel title="Students">
                            <div className="text-sm text-black/70 dark:text-white/70">No students loaded.</div>
                        </Panel>
                    </section>
                </div>
            </main>
        </div>
    );
}

function InfoCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
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

function ScheduleTable() {
    const rows = [
        { time: "08:00 - 08:45", subject: "—", section: "—", room: "—" },
        { time: "09:00 - 09:45", subject: "—", section: "—", room: "—" },
        { time: "10:00 - 10:45", subject: "—", section: "—", room: "—" },
    ];
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-left text-black/70 dark:text-white/70">
                        <th className="py-2 pr-3">Time</th>
                        <th className="py-2 pr-3">Subject</th>
                        <th className="py-2 pr-3">Section</th>
                        <th className="py-2 pr-3">Room</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r, i) => (
                        <tr key={i} className="border-t border-black/10 dark:border-white/10">
                            <td className="py-2 pr-3 whitespace-nowrap">{r.time}</td>
                            <td className="py-2 pr-3">{r.subject}</td>
                            <td className="py-2 pr-3">{r.section}</td>
                            <td className="py-2 pr-3">{r.room}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function AttendanceQuickForm() {
    return (
        <form className="space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
                <Field label="Class"><Input placeholder="Grade 7" /></Field>
                <Field label="Section"><Input placeholder="A" /></Field>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
                <Field label="Subject"><Input placeholder="Mathematics" /></Field>
                <Field label="Period"><Input placeholder="1" /></Field>
            </div>
            <div className="flex flex-wrap gap-2">
                {new Array(10).fill(0).map((_, i) => (
                    <span key={i} className="inline-flex items-center gap-2 rounded-md border border-black/10 dark:border-white/10 px-2 py-1 text-sm">
                        Student {i + 1}
                        <select className="rounded border border-black/10 dark:border-white/10 text-sm">
                            <option>Present</option>
                            <option>Absent</option>
                            <option>Late</option>
                        </select>
                    </span>
                ))}
            </div>
            <div className="flex justify-end gap-2">
                <button type="button" className="rounded-md border px-3 py-2 text-sm">Reset</button>
                <button type="submit" className="rounded-md bg-black text-white dark:bg-white dark:text-black px-3 py-2 text-sm">Submit</button>
            </div>
        </form>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="grid gap-1 text-sm">
            <span className="text-black/80 dark:text-white/80">{label}</span>
            {children}
        </label>
    );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            {...props}
            className={`rounded-md border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/30 dark:focus:ring-white/30 ${props.className ?? ""}`}
        />
    );
}


