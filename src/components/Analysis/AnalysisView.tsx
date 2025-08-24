import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Calendar, Receipt, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Purchase {
  date: string;
  store: string;
  total: number;
  items: string[];
}

const AnalysisView = () => {
  const [activeFilter, setActiveFilter] = useState("7days");
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPeriod, setTotalPeriod] = useState(0);
  const [avgPurchase, setAvgPurchase] = useState(0);
  const { toast } = useToast();

  const filters = [
    { id: "today", label: "Hoje", days: 0 },
    { id: "yesterday", label: "Ontem", days: 1 },
    { id: "7days", label: "7 Dias", days: 7 },
    { id: "30days", label: "30 Dias", days: 30 },
    { id: "90days", label: "90 Dias", days: 90 },
  ];

  useEffect(() => {
    fetchAnalysisData();
  }, [activeFilter]);

  const getDateRange = (days: number) => {
    const now = new Date();
    
    if (days === 0) {
      // Hoje - do início do dia de hoje até agora
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      return { start, end };
    } else if (days === 1) {
      // Ontem - dia completo de ontem
      const start = new Date();
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    } else {
      // Outros períodos - dos últimos N dias até agora
      const start = new Date();
      start.setDate(start.getDate() - days);
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      return { start, end };
    }
  };

  const fetchAnalysisData = async () => {
    try {
      setLoading(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        toast({
          title: "Autenticação necessária",
          description: "Você precisa fazer login para ver sua análise.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const currentFilter = filters.find(f => f.id === activeFilter);
      const { start, end } = getDateRange(currentFilter?.days || 7);

      const { data: cuponsData, error } = await supabase
        .from('cupons')
        .select(`
          id,
          loja_nome,
          valor_total,
          data_compra,
          produtos (
            nome
          )
        `)
        .eq('user_id', user.id)
        .gte('data_compra', start.toISOString())
        .lte('data_compra', end.toISOString())
        .order('data_compra', { ascending: false });

      if (error) {
        console.error('Error fetching analysis data:', error);
        throw new Error('Falha ao carregar dados de análise');
      }

      const purchasesData: Purchase[] = cuponsData.map(cupom => ({
        date: cupom.data_compra,
        store: cupom.loja_nome,
        total: parseFloat(cupom.valor_total.toString()),
        items: cupom.produtos.map(p => p.nome)
      }));

      const total = purchasesData.reduce((sum, purchase) => sum + purchase.total, 0);
      const avg = purchasesData.length > 0 ? total / purchasesData.length : 0;

      setPurchases(purchasesData);
      setTotalPeriod(total);
      setAvgPurchase(avg);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erro ao carregar análise",
        description: error instanceof Error ? error.message : "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
                R$ {loading ? "..." : totalPeriod.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                R$ {loading ? "..." : avgPurchase.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
          {loading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="border-b border-border/50 pb-4 animate-pulse">
                <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/3 mb-2"></div>
                <div className="flex gap-2">
                  <div className="h-6 bg-muted rounded w-16"></div>
                  <div className="h-6 bg-muted rounded w-20"></div>
                </div>
              </div>
            ))
          ) : purchases.length === 0 ? (
            <div className="text-center py-8">
              <Receipt size={48} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2 font-medium">
                Nenhuma compra encontrada
              </p>
              <p className="text-sm text-muted-foreground">
                Não há registros para o período selecionado.
              </p>
            </div>
          ) : (
            purchases.map((purchase, index) => (
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
                {purchase.items.length > 0 && (
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
                )}
              </div>
            ))
          )}
        </div>
      </Card>

      <div className="pb-20" />
    </div>
  );
};

export default AnalysisView;