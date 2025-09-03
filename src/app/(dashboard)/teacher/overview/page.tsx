"use client";

import { useEffect, useState } from "react";
import { useRoleGuard } from "@/lib/roleGuard";
import { authenticatedFetch } from "@/lib/apiClient";
import { supabase } from "@/lib/supabaseClient";

interface ScheduleItem { period_no: number; start_time: string; end_time: string; class_id?: string; section_id?: string; classes?: { name: string }; sections?: { name: string } }

export default function TeacherOverviewPage() {
    const { loading } = useRoleGuard("Teacher");
    const [classesCount, setClassesCount] = useState(0);
    const [pendingCount, setPendingCount] = useState(0);
    const [schedule, setSchedule] = useState<ScheduleItem[]>([]);

    useEffect(() => { if (!loading) load(); }, [loading]);

    async function load() {
        try {
            const res = await authenticatedFetch('/api/teacher/overview/today');
            const data = await res.json();
            if (res.ok) {
                setClassesCount(data?.classesCount ?? 0);
                setPendingCount(data?.pendingCount ?? 0);
                setSchedule(Array.isArray(data?.schedule) ? data.schedule : []);
            } else {
                setClassesCount(0); setPendingCount(0); setSchedule([]);
            }
        } catch {
            setClassesCount(0); setPendingCount(0); setSchedule([]);
        }
    }

    // Title is shown in the header (layout). No title on this page.

    if (loading) return <div className="p-6">Loading…</div>;

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                <InfoCard title="Today's Classes" value={String(classesCount)} subtitle="Scheduled periods" />
                <InfoCard title="Pending Attendance" value={String(pendingCount)} subtitle="Periods to submit" />
            </div>

            <section id="schedule" className="grid gap-6">
                <Panel title="Today's Schedule">
                    <ScheduleTable rows={schedule} />
                </Panel>
            </section>
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

function ScheduleTable({ rows }: { rows: ScheduleItem[] }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-left text-black/70 dark:text-white/70">
                        <th className="py-2 pr-3">Period</th>
                        <th className="py-2 pr-3">Time</th>
                        <th className="py-2 pr-3">Class</th>
                        <th className="py-2 pr-3">Section</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r, i) => (
                        <tr key={i} className="border-t border-black/10 dark:border-white/10">
                            <td className="py-2 pr-3">{r.period_no}</td>
                            <td className="py-2 pr-3 whitespace-nowrap">{r.start_time} – {r.end_time}</td>
                            <td className="py-2 pr-3">{r.classes?.name || '-'}</td>
                            <td className="py-2 pr-3">{r.sections?.name || '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
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


