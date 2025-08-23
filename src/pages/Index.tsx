import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import BottomNavigation from "@/components/Layout/BottomNavigation";
import UserMenu from "@/components/Layout/UserMenu";
import ScannerView from "@/components/Scanner/ScannerView";
import StoresView from "@/components/Stores/StoresView";
import ProductsView from "@/components/Products/ProductsView";
import AnalysisView from "@/components/Analysis/AnalysisView";
import { Loader2 } from "lucide-react";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("scan");

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  const renderContent = () => {
    switch (activeTab) {
      case "scan":
        return <ScannerView />;
      case "stores":
        return <StoresView />;
      case "products":
        return <ProductsView />;
      case "analysis":
        return <AnalysisView />;
      default:
        return <ScannerView />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto min-h-screen flex flex-col">
        {/* Header com menu do usuário */}
        <div className="flex justify-between items-center p-4 border-b bg-card">
          <h1 className="text-xl font-bold text-primary">CupomScan</h1>
          <UserMenu />
        </div>
        
        {renderContent()}
        <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </div>
  );
};

export default Index;
