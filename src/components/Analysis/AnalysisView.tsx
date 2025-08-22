import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Calendar, Receipt, DollarSign } from "lucide-react";

const AnalysisView = () => {
  const [activeFilter, setActiveFilter] = useState("7days");

  const filters = [
    { id: "today", label: "Hoje" },
    { id: "yesterday", label: "Ontem" },
    { id: "7days", label: "7 Dias" },
    { id: "30days", label: "30 Dias" },
    { id: "90days", label: "90 Dias" },
  ];

  // Dados mockados - serão substituídos pela integração com Supabase
  const purchases = [
    { 
      date: "2024-01-20", 
      store: "Supermercado ABC", 
      total: 45.67, 
      items: ["Arroz 5kg", "Feijão 1kg", "Óleo 900ml"] 
    },
    { 
      date: "2024-01-19", 
      store: "Farmácia XYZ", 
      total: 23.40, 
      items: ["Paracetamol", "Vitamina C"] 
    },
    { 
      date: "2024-01-18", 
      store: "Loja de Roupas Fashion", 
      total: 89.99, 
      items: ["Camiseta M", "Calça Jeans"] 
    },
    { 
      date: "2024-01-17", 
      store: "Padaria do Bairro", 
      total: 15.80, 
      items: ["Pão Frances 1kg", "Leite 1L"] 
    },
  ];

  const totalPeriod = purchases.reduce((sum, purchase) => sum + purchase.total, 0);
  const avgPurchase = totalPeriod / purchases.length;

  return (
    <div className="flex-1 px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">Análise de Gastos</h1>
        <p className="text-muted-foreground">
          Acompanhe seu histórico de compras
        </p>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {filters.map((filter) => (
          <Button
            key={filter.id}
            variant={activeFilter === filter.id ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter(filter.id)}
            className="whitespace-nowrap"
          >
            <Calendar size={14} className="mr-1" />
            {filter.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="p-4 shadow-soft">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <DollarSign size={16} className="text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="font-semibold text-lg">
                R$ {totalPeriod.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 shadow-soft">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center">
              <BarChart3 size={16} className="text-accent" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Média</p>
              <p className="font-semibold text-lg">
                R$ {avgPurchase.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4 shadow-soft mb-4">
        <h3 className="font-semibold mb-4 flex items-center">
          <Receipt size={18} className="mr-2 text-primary" />
          Histórico de Compras
        </h3>
        <div className="space-y-4">
          {purchases.map((purchase, index) => (
            <div key={index} className="border-b border-border/50 pb-4 last:border-b-0">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium text-foreground">{purchase.store}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(purchase.date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <p className="font-semibold text-primary">
                  R$ {purchase.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                {purchase.items.map((item, itemIndex) => (
                  <span 
                    key={itemIndex}
                    className="text-xs bg-muted px-2 py-1 rounded-full"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="pb-20" />
    </div>
  );
};

export default AnalysisView;