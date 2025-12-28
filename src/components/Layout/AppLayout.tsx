import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import DesktopSidebar from "./DesktopSidebar";

interface AppLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
}

const AppLayout = ({ children, showSidebar = true }: AppLayoutProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, loading, navigate]);

  // Redirecionar mobile para Index
  useEffect(() => {
    if (!loading && user && isMobile === true) {
      navigate('/', { replace: true });
    }
  }, [user, loading, isMobile, navigate]);

  if (loading || isMobile === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  // Mobile users will be redirected to Index
  if (isMobile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex w-full">
      {showSidebar && <DesktopSidebar />}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
