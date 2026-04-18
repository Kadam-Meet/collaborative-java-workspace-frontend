import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { Sun, Moon, LogOut, Code2, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import NotificationCenter from "@/components/notifications/NotificationCenter";

interface NavbarProps {
  showAuth?: boolean;
  children?: React.ReactNode;
}

const Navbar = ({ showAuth = true, children }: NavbarProps) => {
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-3 shrink-0">
      <Link to="/" className="flex items-center gap-2 font-bold text-foreground hover:text-primary transition-colors">
        <Code2 className="h-5 w-5 text-primary" />
        <span className="hidden sm:inline text-sm">CJW</span>
      </Link>

      {children}

      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {showAuth && isAuthenticated && user && (
          <>
            <NotificationCenter />
            <Link
              to="/profile"
              className="flex items-center gap-2 rounded-full border border-border bg-surface px-2 py-1 transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-foreground leading-none">{user.name}</p>
                <p className="text-[11px] text-muted-foreground leading-none mt-1">View profile</p>
              </div>
              <UserCircle2 className="hidden md:block h-4 w-4 text-muted-foreground" />
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                logout();
                navigate("/");
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </header>
  );
};

export default Navbar;
