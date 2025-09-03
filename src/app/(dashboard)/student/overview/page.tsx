"use client";

import { useEffect, useState } from "react";
import { useRoleGuard } from "@/lib/roleGuard";
import { authenticatedFetch } from "@/lib/apiClient";

interface ScheduleItem { period_no: number; start_time: string; end_time: string; classes?: { name: string }; sections?: { name: string } }

export default function StudentOverviewPage() {
    const { loading } = useRoleGuard("Student");
    const [todayCount, setTodayCount] = useState(0);
    const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
    const [presentCount, setPresentCount] = useState(0);
    const [absentCount, setAbsentCount] = useState(0);

    useEffect(() => { if (!loading) load(); }, [loading]);
    async function load() {
        try {
            const res = await authenticatedFetch('/api/student/overview/today');
            const data = await res.json();
            if (res.ok) {
                setTodayCount(data?.classesCount ?? 0);
                setSchedule(Array.isArray(data?.schedule) ? data.schedule : []);
                setPresentCount(data?.attendance?.present ?? 0);
                setAbsentCount(data?.attendance?.absent ?? 0);
            } else {
                setTodayCount(0); setSchedule([]); setPresentCount(0); setAbsentCount(0);
            }
        } catch { setTodayCount(0); setSchedule([]); setPresentCount(0); setAbsentCount(0); }
    }

    if (loading) return <div className="p-6">Loading…</div>;

    const todayLabel = new Date().toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
    return (
        <div className="p-4 md:p-6 space-y-6">
            <p className="text-sm text-muted-foreground">Today: {todayLabel}</p>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-3">
                <InfoCard title="Today's Classes" value={String(todayCount)} subtitle="Scheduled periods" />
                <InfoCard title="Days Present" value={String(presentCount)} subtitle="Current month" />
                <InfoCard title="Days Absent" value={String(absentCount)} subtitle="Current month" />
            </div>
            <section className="grid gap-6">
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
                    {rows.length === 0 ? (
                        <tr><td className="py-2 pr-3" colSpan={4}>No periods.</td></tr>
                    ) : rows.map((r, i) => (
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


