import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { LogIn, X, ShieldAlert } from "lucide-react";

/**
 * RequireAuth
 *
 * - Authenticated  → renders children normally
 * - Unauthenticated → renders children PLUS a bottom-sheet confirmation
 *   dialog. User can dismiss (stay on page) or confirm (go to /auth).
 *
 * Drop-in replacement: same props as the previous hard-redirect version.
 */
export const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthenticated = !!localStorage.getItem("auth_token");

  const [dismissed, setDismissed] = useState(false);

  // Already authenticated — just render
  if (isAuthenticated) return <>{children}</>;

  // User already dismissed the dialog — let them stay on the page
  // (they can still manually navigate away)
  if (dismissed) return null;

  const handleSignIn = () => {
    navigate("/auth", { state: { from: location }, replace: true });
  };

  const handleStay = () => {
    setDismissed(true);
    // Go back one step so the protected page doesn't linger blank
    navigate(-1);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={handleStay}
      />

      {/* Dialog — anchored to bottom on mobile, centered on desktop */}
      <div className="fixed z-50 inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center px-4 pb-4 sm:pb-0">
        <div className="w-full sm:w-[420px] bg-card border border-border/60 rounded-t-[16px] sm:rounded-[12px] shadow-2xl shadow-black/30 overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">

          {/* Top bar */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border/50">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-[8px] bg-primary/10">
                <ShieldAlert className="h-4 w-4 text-primary" />
              </div>
              <p className="text-[13px] font-bold text-foreground">
                Sign in required
              </p>
            </div>
            <button
              onClick={handleStay}
              className="p-1.5 rounded-[6px] text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4">
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              This page requires an account. Sign in or create a free account
              to continue — or go back and keep browsing without signing in.
            </p>
          </div>

          {/* Actions */}
          <div className="px-5 pb-5 flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleSignIn}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-[8px] bg-primary text-primary-foreground text-[12px] font-semibold hover:bg-primary/90 transition-colors"
            >
              <LogIn className="h-3.5 w-3.5" />
              Sign in
            </button>
            <button
              onClick={handleStay}
              className="flex-1 flex items-center justify-center px-4 py-2.5 rounded-[8px] border border-border/60 text-muted-foreground text-[12px] font-semibold hover:bg-secondary/70 hover:text-foreground transition-colors"
            >
              Go back
            </button>
          </div>

        </div>
      </div>
    </>
  );
};
