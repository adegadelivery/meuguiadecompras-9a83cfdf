import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Store, Package, TrendingUp, Receipt, BarChart3, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import ProductsCatalog from "@/components/Products/ProductsCatalog";

interface DateRange {
  from: Date;
  to: Date;
}

interface DashboardData {
  totalSpent: number;
  totalPurchases: number;
  uniqueStores: number;
  uniqueProducts: number;
  topStores: { name: string; total: number; purchases: number }[];
  topProducts: { name: string; count: number; totalSpent: number }[];
  recentPurchases: { date: string; store: string; total: number }[];
}

const Dashboard = () => {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date()
  });
  const [data, setData] = useState<DashboardData>({
    totalSpent: 0,
    totalPurchases: 0,
    uniqueStores: 0,
    uniqueProducts: 0,
    topStores: [],
    topProducts: [],
    recentPurchases: []
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        toast({
          title: "Autenticação necessária",
          description: "Você precisa fazer login para ver o dashboard.",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }

      // Buscar dados no período selecionado
      const { data: cuponsData, error } = await supabase
        .from('cupons')
        .select(`
          id,
          loja_nome,
          valor_total,
          data_compra,
          produtos (
            nome,
            preco,
            quantidade
          )
        `)
        .eq('user_id', user.id)
        .gte('data_compra', dateRange.from.toISOString())
        .lte('data_compra', dateRange.to.toISOString())
        .order('data_compra', { ascending: false });

      if (error) {
        console.error('Error fetching dashboard data:', error);
        throw new Error('Falha ao carregar dados do dashboard');
      }

      // Processar dados
      const storesMap = new Map<string, { total: number; count: number }>();
      const productsMap = new Map<string, { count: number; totalSpent: number }>();
      let totalSpent = 0;

      cuponsData.forEach(cupom => {
        const total = parseFloat(cupom.valor_total.toString());
        totalSpent += total;

        // Agrupar por loja
        const storeData = storesMap.get(cupom.loja_nome) || { total: 0, count: 0 };
        storeData.total += total;
        storeData.count += 1;
        storesMap.set(cupom.loja_nome, storeData);

        // Agrupar por produto
        cupom.produtos.forEach(produto => {
          const productData = productsMap.get(produto.nome) || { count: 0, totalSpent: 0 };
          productData.count += produto.quantidade;
          productData.totalSpent += parseFloat(produto.preco.toString()) * produto.quantidade;
          productsMap.set(produto.nome, productData);
        });
      });

      // Top 5 lojas
      const topStores = Array.from(storesMap.entries())
        .map(([name, data]) => ({ name, total: data.total, purchases: data.count }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      // Top 5 produtos
      const topProducts = Array.from(productsMap.entries())
        .map(([name, data]) => ({ name, count: data.count, totalSpent: data.totalSpent }))
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 5);

      // Compras recentes
      const recentPurchases = cuponsData.slice(0, 5).map(cupom => ({
        date: cupom.data_compra,
        store: cupom.loja_nome,
        total: parseFloat(cupom.valor_total.toString())
      }));

      setData({
        totalSpent,
        totalPurchases: cuponsData.length,
        uniqueStores: storesMap.size,
        uniqueProducts: productsMap.size,
        topStores,
        topProducts,
        recentPurchases
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erro ao carregar dashboard",
        description: error instanceof Error ? error.message : "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Visão geral dos seus gastos</p>
          </div>
          
          {/* Date Range Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full md:w-auto">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} - {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    setDateRange({ from: range.from, to: range.to });
                  }
                }}
                locale={ptBR}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <DollarSign size={24} className="text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Gasto</p>
                <p className="text-2xl font-bold">
                  R$ {loading ? "..." : data.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                <Receipt size={24} className="text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Compras</p>
                <p className="text-2xl font-bold">
                  {loading ? "..." : data.totalPurchases}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                <Store size={24} className="text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Lojas</p>
                <p className="text-2xl font-bold">
                  {loading ? "..." : data.uniqueStores}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
                <Package size={24} className="text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Produtos</p>
                <p className="text-2xl font-bold">
                  {loading ? "..." : data.uniqueProducts}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Stores */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center">
              <Store size={18} className="mr-2 text-primary" />
              Top 5 Lojas
            </h3>
            <div className="space-y-4">
              {loading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                    <div className="h-6 bg-muted rounded w-1/3"></div>
                  </div>
                ))
              ) : data.topStores.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhuma loja encontrada no período selecionado
                </p>
              ) : (
                data.topStores.map((store, index) => (
                  <div key={store.name} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{store.name}</p>
                      <p className="text-sm text-muted-foreground">{store.purchases} compras</p>
                    </div>
                    <p className="font-semibold text-primary">
                      R$ {store.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Top Products */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center">
              <Package size={18} className="mr-2 text-accent" />
              Top 5 Produtos
            </h3>
            <div className="space-y-4">
              {loading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                    <div className="h-6 bg-muted rounded w-1/3"></div>
                  </div>
                ))
              ) : data.topProducts.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhum produto encontrado no período selecionado
                </p>
              ) : (
                data.topProducts.map((product, index) => (
                  <div key={product.name} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{product.count}x comprado</p>
                    </div>
                    <p className="font-semibold text-primary">
                      R$ {product.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Grid with Recent Purchases and Complete Products */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Purchases */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center">
              <Receipt size={18} className="mr-2 text-success" />
              Compras Recentes
            </h3>
            <div className="space-y-4">
              {loading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="animate-pulse border-b border-border/50 pb-4">
                    <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                    <div className="h-6 bg-muted rounded w-1/4"></div>
                  </div>
                ))
              ) : data.recentPurchases.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhuma compra encontrada no período selecionado
                </p>
              ) : (
                data.recentPurchases.map((purchase, index) => (
                  <div key={index} className="flex justify-between items-center border-b border-border/50 pb-4 last:border-0">
                    <div>
                      <p className="font-medium">{purchase.store}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(purchase.date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <p className="font-semibold text-primary">
                      R$ {purchase.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Products Analysis Preview */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center">
                <Package size={18} className="mr-2 text-warning" />
                Produtos Mais Comprados
              </h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/product/all')}
              >
                Ver Todos
              </Button>
            </div>
            <div className="space-y-4">
              {loading ? (
                [1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse border-b border-border/50 pb-4">
                    <div className="h-4 bg-muted rounded w-2/3 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/3"></div>
                  </div>
                ))
              ) : data.topProducts.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhum produto encontrado
                </p>
              ) : (
                data.topProducts.slice(0, 3).map((product, index) => (
                  <div key={product.name} className="border-b border-border/50 pb-4 last:border-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.count}x comprado
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-primary">
                        R$ {product.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Complete Products Catalog */}
        <ProductsCatalog dateRange={dateRange} loading={loading} />
      </div>
    </div>
  );
};

export default Dashboard;