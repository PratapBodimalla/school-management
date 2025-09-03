"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { normalizeAndRouteByRole } from "@/lib/roleGuard";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        let mounted = true;

        const checkAuthAndRedirect = async () => {
            try {
                // Check if user is authenticated
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (sessionError) {
                    console.error("Session error in dashboard layout:", sessionError);
                    if (mounted) {
                        router.replace("/");
                        return;
                    }
                }

                if (!session) {
                    console.log("No session found, redirecting to auth page");
                    if (mounted) {
                        router.replace("/");
                        return;
                    }
                }

                // Get user profile to determine role - FIXED TABLE NAME
                const { data: profile, error: profileError } = await supabase
                    .from("users_profile")  // ✅ FIXED: Changed from "users" to "users_profile"
                    .select("role")
                    .eq("id", session?.user.id)
                    .maybeSingle();

                if (profileError) {
                    console.error("Profile query error in dashboard layout:", profileError);
                    if (mounted) {
                        router.replace("/");
                        return;
                    }
                }

                if (mounted) {
                    setIsAuthenticated(true);
                    setLoading(false);

                    // If we're at the root path, redirect to role-specific dashboard
                    if (window.location.pathname === "/") {
                        const route = normalizeAndRouteByRole(profile?.role);
                        if (route) {
                            console.log(`Redirecting to role-specific dashboard: ${route}`);
                            router.replace(route);
                        }
                    }
                }
            } catch (error) {
                console.error("Auth check error in dashboard layout:", error);
                if (mounted) {
                    router.replace("/");
                }
            }
        };

        checkAuthAndRedirect();

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === "SIGNED_OUT") {
                    console.log("User signed out, redirecting to auth page");
                    router.replace("/");
                } else if (event === "SIGNED_IN" && session) {
                    console.log("User signed in, checking auth and redirecting");
                    await checkAuthAndRedirect();
                }
            }
        );

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null; // Will redirect to login
    }

    return <>{children}</>;
}
