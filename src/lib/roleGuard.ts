"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type NormalizedRole = "Admin" | "Teacher" | "Student";

function normalizeRole(role: string | null | undefined): NormalizedRole | null {
    if (!role) return null;
    // Keep the original case as stored in database
    if (role === "Admin" || role === "Teacher" || role === "Student") return role;
    return null;
}

function routeForRole(role: NormalizedRole): string {
    if (role === "Admin") return "/admin";
    if (role === "Teacher") return "/teacher";
    return "/student";
}

export function useRoleGuard(requiredRole: NormalizedRole) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                // Get session data
                const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

                if (sessionError) {
                    console.error("Session error:", sessionError);
                    if (mounted) {
                        router.replace("/");
                        return;
                    }
                }

                const userId = sessionData.session?.user.id;

                if (!userId) {
                    console.log("No user ID in session, redirecting to auth page");
                    if (mounted) {
                        router.replace("/");
                        return;
                    }
                }

                // Query the CORRECT table name: users_profile
                const { data: profileRow, error: profileError } = await supabase
                    .from("users_profile")  // ✅ FIXED: Changed from "users" to "users_profile"
                    .select("role")
                    .eq("id", userId)
                    .maybeSingle();

                if (profileError) {
                    console.error("Profile query error:", profileError);
                    if (mounted) {
                        router.replace("/");
                        return;
                    }
                }

                const userRole = normalizeRole(profileRow?.role);

                if (!userRole) {
                    console.log("No role found for user:", userId);
                    if (mounted) {
                        router.replace("/");
                        return;
                    }
                }

                if (userRole !== requiredRole) {
                    if (mounted) {
                        if (userRole) {
                            console.log(`User role ${userRole} doesn't match required role ${requiredRole}, redirecting`);
                            router.replace(routeForRole(userRole));
                        } else {
                            router.replace("/");
                        }
                        return;
                    }
                }

                if (mounted) {
                    console.log(`User authorized with role: ${userRole}`);
                    setIsAuthorized(true);
                    setLoading(false);
                }
            } catch (error) {
                console.error("Role guard error:", error);
                if (mounted) {
                    router.replace("/");
                }
            }
        })();

        return () => {
            mounted = false;
        };
    }, [requiredRole, router]);

    return { loading, isAuthorized };
}

export function normalizeAndRouteByRole(role: string | null | undefined): string | null {
    const r = normalizeRole(role);
    return r ? routeForRole(r) : null;
}


