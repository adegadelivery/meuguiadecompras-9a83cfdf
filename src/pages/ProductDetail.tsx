import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Package, Store, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

const ProductDetail = () => {
  const { productName } = useParams<{ productName: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
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
        price: parseFloat(item.preco.toString()),
        quantity: item.quantidade
      }));

      // Calcular dados por loja
      const storesMap = new Map<string, {
        purchaseCount: number;
        totalQuantity: number;
        prices: number[];
        totalSpent: number;
      }>();

      data.forEach(item => {
        const store = item.cupons.loja_nome;
        const price = parseFloat(item.preco.toString());
        const quantity = item.quantidade;
        
        const existing = storesMap.get(store) || {
          purchaseCount: 0,
          totalQuantity: 0,
          prices: [],
          totalSpent: 0
        };
        
        existing.purchaseCount += 1;
        existing.totalQuantity += quantity;
        existing.prices.push(price);
        existing.totalSpent += price * quantity;
        
        storesMap.set(store, existing);
      });

      const storesData: StoreData[] = Array.from(storesMap.entries())
        .map(([name, data]) => ({
          name,
          purchaseCount: data.purchaseCount,
          totalQuantity: data.totalQuantity,
          averagePrice: data.prices.reduce((sum, p) => sum + p, 0) / data.prices.length,
          lastPrice: data.prices[0], // Já vem ordenado por created_at desc
          totalSpent: data.totalSpent
        }))
        .sort((a, b) => b.totalSpent - a.totalSpent);

      // Calcular estatísticas gerais
      const allPrices = data.map(item => parseFloat(item.preco.toString()));
      const totalQty = data.reduce((sum, item) => sum + item.quantidade, 0);
      const avgPrice = allPrices.reduce((sum, price) => sum + price, 0) / allPrices.length;
      const minPrice = Math.min(...allPrices);
      const maxPrice = Math.max(...allPrices);

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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp size={20} className="text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Preço Médio</p>
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
                <p className="text-xs text-muted-foreground">Menor Preço</p>
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
                <p className="text-xs text-muted-foreground">Maior Preço</p>
                <p className="font-semibold text-lg text-destructive">
                  R$ {priceRange.max.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Por Loja */}
        <Card className="mb-6">
          <div className="p-4 border-b">
            <h2 className="font-semibold flex items-center gap-2">
              <Store size={18} />
              Por Loja
            </h2>
          </div>
          <div className="p-4 space-y-4">
            {stores.map((store, index) => (
              <div key={store.name} className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium">{store.name}</h3>
                  <div className="text-sm text-muted-foreground">
                    {store.purchaseCount} compras • {store.totalQuantity} unidades
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    R$ {store.averagePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
          <div className="p-4 space-y-3">
            {purchases.map((purchase, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                <div>
                  <p className="font-medium">{purchase.store}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(purchase.date).toLocaleDateString('pt-BR')} • {purchase.quantity}x
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    R$ {purchase.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Total: R$ {(purchase.price * purchase.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="pb-20" />
      </div>
    </div>
  );
};

export default ProductDetail;