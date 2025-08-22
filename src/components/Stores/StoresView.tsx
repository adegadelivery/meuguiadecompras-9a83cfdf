import { Card } from "@/components/ui/card";
import { Store, TrendingUp, Receipt } from "lucide-react";

const StoresView = () => {
  // Dados mockados - serão substituídos pela integração com Supabase
  const stores = [
    { name: "Supermercado ABC", total: 234.56, purchases: 12 },
    { name: "Farmácia XYZ", total: 189.43, purchases: 8 },
    { name: "Loja de Roupas Fashion", total: 156.78, purchases: 4 },
    { name: "Padaria do Bairro", total: 89.90, purchases: 15 },
    { name: "Pet Shop Central", total: 67.32, purchases: 3 },
  ];

  const totalSpent = stores.reduce((sum, store) => sum + store.total, 0);

  return (
    <div className="flex-1 px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">Minhas Lojas</h1>
        <p className="text-muted-foreground">
          Acompanhe onde você mais gasta
        </p>
      </div>

      <Card className="p-6 shadow-medium mb-6 bg-gradient-primary">
        <div className="text-center text-primary-foreground">
          <TrendingUp size={32} className="mx-auto mb-3 opacity-90" />
          <p className="text-sm opacity-90 mb-1">Total Gasto</p>
          <p className="text-3xl font-bold">
            R$ {totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-sm opacity-75 mt-2">
            em {stores.length} lojas diferentes
          </p>
        </div>
      </Card>

      <div className="space-y-3">
        {stores.map((store, index) => (
          <Card key={store.name} className="p-4 shadow-soft hover:shadow-medium transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Store size={18} className="text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{store.name}</h3>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Receipt size={12} className="mr-1" />
                    {store.purchases} compras
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-success text-lg">
                  R$ {store.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <div className="flex items-center text-xs text-muted-foreground">
                  #{index + 1} em gastos
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="pb-20" />
    </div>
  );
};

export default StoresView;