import { useState } from "react";
import BottomNavigation from "@/components/Layout/BottomNavigation";
import ScannerView from "@/components/Scanner/ScannerView";
import StoresView from "@/components/Stores/StoresView";
import ProductsView from "@/components/Products/ProductsView";
import AnalysisView from "@/components/Analysis/AnalysisView";

const Index = () => {
  const [activeTab, setActiveTab] = useState("scan");

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
        {renderContent()}
        <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </div>
  );
};

export default Index;
