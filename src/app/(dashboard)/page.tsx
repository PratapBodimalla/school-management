"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function roleToDashboardPath(role?: string | null) {
    if (!role) return "/";
    const r = String(role).toLowerCase();
    if (r === "admin") return "/admin";
    if (r === "teacher") return "/teacher";
    if (r === "student") return "/student";
    return "/";
}

export default function DashboardPage() {
    const router = useRouter();

    // Instant redirect on existing session (page load)
    useEffect(() => {
        const redirectToRoleDashboard = async () => {
            try {
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (sessionError) {
                    console.error("Session error in dashboard page:", sessionError);
                    router.replace("/");
                    return;
                }

                if (!session) {
                    // Not signed in yet – stay here (your sign-in UI should handle moving forward)
                    return;
                }

                // Prefer role from user metadata (fast path)
                const meta = session.user?.user_metadata as Record<string, unknown> | undefined;
                const metaRole = (meta?.role as string | undefined) ?? undefined;
                if (metaRole) {
                    router.replace(roleToDashboardPath(metaRole));
                    return;
                }

                // Fallback: fetch from users_profile
                const { data: profile, error: profileError } = await supabase
                    .from("users_profile")
                    .select("role")
                    .eq("id", session.user.id)
                    .maybeSingle();

                if (profileError) {
                    console.error("Profile query error in dashboard page:", profileError);
                    router.replace("/");
                    return;
                }

                router.replace(roleToDashboardPath(profile?.role ?? null));
            } catch (error) {
                console.error("Dashboard redirect error:", error);
                router.replace("/");
            }
        };

        redirectToRoleDashboard();
    }, [router]);

    // Instant redirect on auth state changes (sign-up / sign-in)
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === "SIGNED_IN" && session) {
                const meta = session.user?.user_metadata as Record<string, unknown> | undefined;
                const metaRole = (meta?.role as string | undefined) ?? undefined;
                if (metaRole) {
                    router.replace(roleToDashboardPath(metaRole));
                    return;
                }

                const { data: profile } = await supabase
                    .from("users_profile")
                    .select("role")
                    .eq("id", session.user.id)
                    .maybeSingle();
                router.replace(roleToDashboardPath(profile?.role ?? null));
            }
        });

        return () => subscription.unsubscribe();
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Redirecting to your dashboard...</p>
            </div>
        </div>
    );
}


