import { cn } from "@/lib/utils";
import { Store, Package, BarChart3, Camera, CreditCard } from "lucide-react";

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: "scan", label: "Scanner", icon: Camera, isMain: true },
  { id: "stores", label: "Lojas", icon: Store },
  { id: "products", label: "Produtos", icon: Package },
  { id: "analysis", label: "Análise", icon: BarChart3 },
  { id: "bills", label: "Contas", icon: CreditCard },
];

const BottomNavigation = ({ activeTab, onTabChange }: BottomNavigationProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-strong">
      <div className="flex items-center justify-around py-2 px-4 max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isMainButton = tab.isMain;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-all duration-200",
                isMainButton 
                  ? "bg-gradient-accent shadow-medium -mt-6 px-6 py-4 rounded-full" 
                  : isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Icon 
                size={isMainButton ? 28 : 20} 
                className={cn(
                  "transition-transform duration-200",
                  isMainButton ? "text-accent-foreground" : "",
                  isActive && !isMainButton ? "scale-110" : ""
                )}
              />
              <span 
                className={cn(
                  "text-xs font-medium mt-1 transition-colors duration-200",
                  isMainButton ? "text-accent-foreground" : ""
                )}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;