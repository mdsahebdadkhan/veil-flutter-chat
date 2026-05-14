import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { BottomNav } from "@/components/BottomNav";
import { AuroraBackground } from "@/components/AuroraBackground";
import { FloatingParticles } from "@/components/FloatingParticles";

/**
 * Pathless layout for the authenticated app shell.
 * Wraps /chats, /groups, /explore, /profile with the floating bottom nav.
 * The chat thread (/chat/$peerId) lives outside this layout for full-screen.
 */
export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", replace: true });
  }, [user, loading, navigate]);

  if (!user) return null;

  return (
    <div className="relative min-h-screen">
      <AuroraBackground />
      <FloatingParticles count={14} />
      <Outlet />
      <BottomNav />
    </div>
  );
}
