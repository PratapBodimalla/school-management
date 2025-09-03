"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRoleGuard } from "@/lib/roleGuard";

export default function AdminDashboardPage() {
    const { loading } = useRoleGuard("Admin");
    const router = useRouter();

    useEffect(() => {
        if (!loading) router.replace("/admin/overview");
    }, [loading, router]);

    return <div className="p-6">Redirecting…</div>;
}
