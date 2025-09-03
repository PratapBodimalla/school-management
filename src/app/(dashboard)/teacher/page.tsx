"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function TeacherIndexRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/teacher/overview');
    }, [router]);
    return null;
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


