import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Package, Store, TrendingUp, TrendingDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import BottomNavigation from "@/components/Layout/BottomNavigation";
import AppLayout from "@/components/Layout/AppLayout";
import { cn } from "@/lib/utils";

interface ProductPurchase {
  date: string;
  store: string;
  price: number;
  quantity: number;
}

interface StoreData {
  name: string;
  purchaseCount: number;
  totalQuantity: number;
  averagePrice: number;
  lastPrice: number;
  totalSpent: number;
}

const ProductDetailContent = () => {
  const { productName } = useParams<{ productName: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [purchases, setPurchases] = useState<ProductPurchase[]>([]);
  const [stores, setStores] = useState<StoreData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPurchases, setTotalPurchases] = useState(0);
  const [averagePrice, setAveragePrice] = useState(0);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 0 });

  useEffect(() => {
    if (productName) {
      fetchProductData();
    }
  }, [productName]);

  const fetchProductData = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        toast({
          title: "Autenticação necessária",
          description: "Você precisa fazer login para ver os detalhes do produto.",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }

      const decodedProductName = decodeURIComponent(productName!);

      // Buscar todas as compras do produto
      const { data, error } = await supabase
        .from('produtos')
        .select(`
          nome,
          preco,
          preco_unitario,
          quantidade,
          created_at,
          cupons!inner (
            loja_nome,
            data_compra,
            user_id
          )
        `)
        .eq('cupons.user_id', user.id)
        .ilike('nome', decodedProductName)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching product data:', error);
        throw new Error('Falha ao carregar dados do produto');
      }

      // Processar dados das compras
      const purchasesData: ProductPurchase[] = data.map(item => ({
        date: item.cupons.data_compra,
        store: item.cupons.loja_nome,
        price: parseFloat((item.preco_unitario || item.preco).toString()),
        quantity: item.quantidade
      }));

      // Calcular dados por loja
      const storesMap = new Map<string, {
        purchaseCount: number;
        totalQuantity: number;
        unitPrices: number[];
        totalSpent: number;
      }>();

      data.forEach(item => {
        const store = item.cupons.loja_nome;
        const unitPrice = parseFloat((item.preco_unitario || item.preco).toString());
        const totalPrice = parseFloat(item.preco.toString());
        const quantity = item.quantidade;
        
        const existing = storesMap.get(store) || {
          purchaseCount: 0,
          totalQuantity: 0,
          unitPrices: [],
          totalSpent: 0
        };
        
        existing.purchaseCount += 1;
        existing.totalQuantity += quantity;
        existing.unitPrices.push(unitPrice);
        existing.totalSpent += totalPrice;
        
        storesMap.set(store, existing);
      });

      const storesData: StoreData[] = Array.from(storesMap.entries())
        .map(([name, data]) => ({
          name,
          purchaseCount: data.purchaseCount,
          totalQuantity: data.totalQuantity,
          averagePrice: data.unitPrices.reduce((sum, p) => sum + p, 0) / data.unitPrices.length,
          lastPrice: data.unitPrices[0], // Já vem ordenado por created_at desc
          totalSpent: data.totalSpent
        }))
        .sort((a, b) => b.totalSpent - a.totalSpent);

      // Calcular estatísticas gerais
      const allUnitPrices = data.map(item => parseFloat((item.preco_unitario || item.preco).toString()));
      const totalQty = data.reduce((sum, item) => sum + item.quantidade, 0);
      const avgPrice = allUnitPrices.reduce((sum, price) => sum + price, 0) / allUnitPrices.length;
      const minPrice = Math.min(...allUnitPrices);
      const maxPrice = Math.max(...allUnitPrices);

      setPurchases(purchasesData);
      setStores(storesData);
      setTotalPurchases(totalQty);
      setAveragePrice(avgPrice);
      setPriceRange({ min: minPrice, max: maxPrice });
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const handleTabChange = (tab: string) => {
    navigate("/", { state: { tab } });
  };

  const content = (
    <div className={cn("min-h-screen bg-background", !isMobile && "p-6")}>
      <div className={cn("mx-auto", isMobile ? "max-w-4xl p-4" : "max-w-7xl")}>
        {/* Breadcrumb for desktop */}
        {!isMobile && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <button onClick={() => navigate('/products')} className="hover:text-foreground transition-colors">
              Produtos
            </button>
            <ChevronRight size={14} />
            <span className="text-foreground font-medium">{decodeURIComponent(productName!)}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft size={16} />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
              <Package size={20} className="text-accent" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {decodeURIComponent(productName!)}
              </h1>
              <p className="text-sm text-muted-foreground">
                Comprado {totalPurchases}x em {stores.length} {stores.length === 1 ? 'loja' : 'lojas'}
              </p>
            </div>
          </div>
        </div>

        {/* Estatísticas */}
        <div className={cn(
          "grid gap-4 mb-6",
          isMobile ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-3 lg:grid-cols-4"
        )}>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp size={20} className="text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Preço Unit. Médio</p>
                <p className="font-semibold text-lg">
                  R$ {averagePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <TrendingDown size={20} className="text-success" />
              <div>
                <p className="text-xs text-muted-foreground">Menor Preço Unit.</p>
                <p className="font-semibold text-lg text-success">
                  R$ {priceRange.min.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp size={20} className="text-destructive" />
              <div>
                <p className="text-xs text-muted-foreground">Maior Preço Unit.</p>
                <p className="font-semibold text-lg text-destructive">
                  R$ {priceRange.max.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </Card>

          {!isMobile && (
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Store size={20} className="text-info" />
                <div>
                  <p className="text-xs text-muted-foreground">Lojas</p>
                  <p className="font-semibold text-lg">
                    {stores.length}
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>

        <div className={cn(
          "grid gap-6",
          !isMobile && "grid-cols-1 lg:grid-cols-2"
        )}>
          {/* Por Loja */}
          <Card className="mb-6 lg:mb-0">
            <div className="p-4 border-b">
              <h2 className="font-semibold flex items-center gap-2">
                <Store size={18} />
                Por Loja
              </h2>
            </div>
            <div className="p-4 space-y-4">
              {stores.map((store, index) => (
                <div 
                  key={store.name} 
                  className="flex justify-between items-center cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors"
                  onClick={() => navigate(`/store/${encodeURIComponent(store.name)}`)}
                >
                  <div>
                    <h3 className="font-medium">{store.name}</h3>
                    <div className="text-sm text-muted-foreground">
                      {store.purchaseCount} compras • {store.totalQuantity} unidades
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      R$ {store.averagePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/un
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Total: R$ {store.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Histórico de Compras */}
          <Card>
            <div className="p-4 border-b">
              <h2 className="font-semibold flex items-center gap-2">
                <Package size={18} />
                Histórico de Compras
              </h2>
            </div>
            <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
              {purchases.map((purchase, index) => (
                <div 
                  key={index} 
                  className="flex justify-between items-center py-2 border-b border-border/50 last:border-0 cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors"
                  onClick={() => navigate(`/store/${encodeURIComponent(purchase.store)}`)}
                >
                  <div>
                    <p className="font-medium">{purchase.store}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(purchase.date).toLocaleDateString('pt-BR')} • {purchase.quantity}x
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      R$ {purchase.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/un
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Total: R$ {(purchase.price * purchase.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {isMobile && <div className="pb-20" />}
      </div>
      {isMobile && <BottomNavigation activeTab="products" onTabChange={handleTabChange} />}
    </div>
  );

  // Desktop: wrap with AppLayout, Mobile: render directly
  if (isMobile) {
    return content;
  }

  return <AppLayout>{content}</AppLayout>;
};

const ProductDetail = () => {
  const isMobile = useIsMobile();

  if (isMobile === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return <ProductDetailContent />;
};

export default ProductDetail;
