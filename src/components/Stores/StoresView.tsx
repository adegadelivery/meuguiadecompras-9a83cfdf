import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Store, TrendingUp, Receipt, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface LojaData {
  name: string;
  total: number;
  purchases: number;
  bills: number;
  hasReceipts: boolean;
  hasBills: boolean;
}

interface StoresViewProps {
  isDesktop?: boolean;
}

const StoresView = ({ isDesktop = false }: StoresViewProps) => {
  const [stores, setStores] = useState<LojaData[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchStoresData();
  }, []);

  const fetchStoresData = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        toast({
          title: "Autenticação necessária",
          description: "Você precisa fazer login para ver suas lojas.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Fetch cupons
      const { data: cuponsData, error: cuponsError } = await supabase
        .from('cupons')
        .select('loja_nome, valor_total')
        .eq('user_id', user.id);

      if (cuponsError) {
        console.error('Error fetching cupons:', cuponsError);
        throw new Error('Falha ao carregar dados dos cupons');
      }

      // Fetch paid bills
      const { data: billsData, error: billsError } = await supabase
        .from('contas_pagar')
        .select('fornecedor_nome, valor')
        .eq('user_id', user.id)
        .eq('status', 'paga');

      if (billsError) {
        console.error('Error fetching bills:', billsError);
        throw new Error('Falha ao carregar dados das contas');
      }

      // Unified map for stores/suppliers
      const storesMap = new Map<string, { 
        total: number; 
        purchases: number; 
        bills: number; 
      }>();
      let total = 0;

      // Process cupons
      (cuponsData || []).forEach(cupom => {
        const existing = storesMap.get(cupom.loja_nome) || { total: 0, purchases: 0, bills: 0 };
        const valor = parseFloat(cupom.valor_total.toString());
        storesMap.set(cupom.loja_nome, {
          total: existing.total + valor,
          purchases: existing.purchases + 1,
          bills: existing.bills
        });
        total += valor;
      });

      // Process bills
      (billsData || []).forEach(bill => {
        const existing = storesMap.get(bill.fornecedor_nome) || { total: 0, purchases: 0, bills: 0 };
        const valor = parseFloat(bill.valor.toString());
        storesMap.set(bill.fornecedor_nome, {
          total: existing.total + valor,
          purchases: existing.purchases,
          bills: existing.bills + 1
        });
        total += valor;
      });

      const storesArray = Array.from(storesMap.entries())
        .map(([name, data]) => ({
          name,
          total: data.total,
          purchases: data.purchases,
          bills: data.bills,
          hasReceipts: data.purchases > 0,
          hasBills: data.bills > 0
        }))
        .sort((a, b) => b.total - a.total);

      setStores(storesArray);
      setTotalSpent(total);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erro ao carregar dados",
        description: error instanceof Error ? error.message : "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStoreIcon = (store: LojaData) => {
    if (store.hasReceipts && store.hasBills) {
      return (
        <div className="flex -space-x-1">
          <Store size={14} className="text-primary" />
          <CreditCard size={14} className="text-warning" />
        </div>
      );
    }
    if (store.hasBills) {
      return <CreditCard size={18} className="text-warning" />;
    }
    return <Store size={18} className="text-primary" />;
  };

  const getStoreSubtitle = (store: LojaData) => {
    const parts = [];
    if (store.purchases > 0) {
      parts.push(`${store.purchases} compra${store.purchases > 1 ? 's' : ''}`);
    }
    if (store.bills > 0) {
      parts.push(`${store.bills} conta${store.bills > 1 ? 's' : ''} paga${store.bills > 1 ? 's' : ''}`);
    }
    return parts.join(' • ');
  };

  return (
    <div className={cn("flex-1", isDesktop ? "" : "px-4 py-6")}>
      {!isDesktop && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">Lojas e Fornecedores</h1>
          <p className="text-muted-foreground">
            Acompanhe onde você mais gasta
          </p>
        </div>
      )}

      <Card className={cn("p-6 shadow-medium mb-6 bg-gradient-primary", isDesktop && "max-w-md")}>
        <div className="text-center text-primary-foreground">
          <TrendingUp size={32} className="mx-auto mb-3 opacity-90" />
          <p className="text-sm opacity-90 mb-1">Total Gasto</p>
          <p className="text-3xl font-bold">
            R$ {totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-sm opacity-75 mt-2">
            em {stores.length} lojas/fornecedores
          </p>
        </div>
      </Card>

      <div className={cn(
        isDesktop 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" 
          : "space-y-3"
      )}>
        {loading ? (
          [1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="p-4">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                <div className="h-6 bg-muted rounded w-1/4"></div>
              </div>
            </Card>
          ))
        ) : stores.length === 0 ? (
          <Card className="p-8 text-center shadow-soft col-span-full">
            <Store size={48} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2 font-medium">Nenhuma loja encontrada</p>
            <p className="text-sm text-muted-foreground">
              Escaneie cupons ou cadastre contas para começar a acompanhar seus gastos.
            </p>
          </Card>
        ) : (
          stores.map((store, index) => (
            <Card 
              key={store.name} 
              className="p-4 shadow-soft hover:shadow-medium transition-all cursor-pointer hover:scale-[1.02]"
              onClick={() => navigate(`/store/${encodeURIComponent(store.name)}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    store.hasBills && !store.hasReceipts ? "bg-warning/10" : "bg-primary/10"
                  )}>
                    {getStoreIcon(store)}
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{store.name}</h3>
                    <div className="flex items-center text-xs text-muted-foreground">
                      {store.hasReceipts && <Receipt size={12} className="mr-1" />}
                      {store.hasBills && <CreditCard size={12} className="mr-1" />}
                      {getStoreSubtitle(store)}
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
          ))
        )}
      </div>

      {!isDesktop && <div className="pb-20" />}
    </div>
  );
};

export default StoresView;