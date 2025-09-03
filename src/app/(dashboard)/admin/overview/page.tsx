"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authenticatedFetch } from "@/lib/apiClient";
import { Users, GraduationCap, BookOpen, Calendar } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

interface DashboardStats {
    totalStudents: number;
    totalTeachers: number;
    totalClasses: number;
    totalSections: number;
}

export default function AdminOverviewPage() {
    const [stats, setStats] = useState<DashboardStats>({
        totalStudents: 0,
        totalTeachers: 0,
        totalClasses: 0,
        totalSections: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardStats();
    }, []);

    const fetchDashboardStats = async () => {
        try {
            // Fetch students count
            const studentsResponse = await authenticatedFetch('/api/students?limit=1');
            const studentsData = await studentsResponse.ok ? await studentsResponse.json() : { pagination: { total: 0 } };

            // For now, we'll set placeholder values for other stats
            // These can be implemented when the respective APIs are created
            setStats({
                totalStudents: studentsData.pagination?.total || 0,
                totalTeachers: 0, // TODO: Implement when teachers API is ready
                totalClasses: 0,  // TODO: Implement when classes API is ready
                totalSections: 0  // TODO: Implement when sections API is ready
            });
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <SummaryCard title="Total Students Enrolled" value="—" icon={Users} />
                <SummaryCard title="Total Teachers Enrolled" value="—" icon={BookOpen} />
                <SummaryCard title="Total Classes Offered" value="—" icon={GraduationCap} />
                <SummaryCard title="Total Sections per Class" value="—" icon={Calendar} />
            </div>
        );
    }

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
                title="Total Students Enrolled"
                value={stats.totalStudents.toString()}
                icon={Users}
                description="Active student accounts"
            />
            <SummaryCard
                title="Total Teachers Enrolled"
                value={stats.totalTeachers.toString()}
                icon={BookOpen}
                description="Active teacher accounts"
            />
            <SummaryCard
                title="Total Classes Offered"
                value={stats.totalClasses.toString()}
                icon={GraduationCap}
                description="Available grade levels"
            />
            <SummaryCard
                title="Total Sections per Class"
                value={stats.totalSections.toString()}
                icon={Calendar}
                description="Class divisions"
            />
        </div>
    );
}

function SummaryCard({
    title,
    value,
    icon: Icon,
    description
}: {
    title: string;
    value: string;
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    description?: string;
}) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {description && (
                    <p className="text-xs text-muted-foreground mt-1">
                        {description}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}


