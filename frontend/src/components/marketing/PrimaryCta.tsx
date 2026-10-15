"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";

export function PrimaryCta() {
    const { user, loading, profile, profileLoading } = useAuth();

    if (loading || profileLoading || !user) {
        return <Button href="/register">Join the waitlist</Button>;
    }

    if (profile?.community) {
        return <Button href="/waitlist/leaderboard">Signup leaderboard</Button>;
    }

    return <Button href="/profile">Complete profile</Button>;
}
