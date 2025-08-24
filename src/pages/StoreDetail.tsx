import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Store, Receipt, Package, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import BottomNavigation from "@/components/Layout/BottomNavigation";

interface Purchase {
  id: string;
  date: string;
  total: number;
  products: { nome: string; preco: number; quantidade: number }[];
}

interface ProductSummary {
  name: string;
  totalQuantity: number;
  totalSpent: number;
  averagePrice: number;
  purchaseCount: number;
}

const StoreDetail = () => {
  const { storeName } = useParams<{ storeName: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalSpent, setTotalSpent] = useState(0);

  useEffect(() => {
    if (storeName) {
      fetchStoreData();
    }
  }, [storeName]);

  const fetchStoreData = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        toast({
          title: "Autenticação necessária",
          description: "Você precisa fazer login para ver os detalhes da loja.",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }

      const decodedStoreName = decodeURIComponent(storeName!);

      // Buscar todas as compras da loja
      const { data: cuponsData, error } = await supabase
        .from('cupons')
        .select(`
          id,
          valor_total,
          data_compra,
          produtos (
            nome,
            preco,
            quantidade
          )
        `)
        .eq('user_id', user.id)
        .eq('loja_nome', decodedStoreName)
        .order('data_compra', { ascending: false });

      if (error) {
        console.error('Error fetching store data:', error);
        throw new Error('Falha ao carregar dados da loja');
      }

      // Processar dados das compras
      const purchasesData: Purchase[] = cuponsData.map(cupom => ({
        id: cupom.id,
        date: cupom.data_compra,
        total: parseFloat(cupom.valor_total.toString()),
        products: cupom.produtos.map(p => ({
          nome: p.nome,
          preco: parseFloat(p.preco.toString()),
          quantidade: p.quantidade
        }))
      }));

      // Calcular resumo dos produtos
      const productsMap = new Map<string, {
        totalQuantity: number;
        totalSpent: number;
        prices: number[];
        count: number;
      }>();

      cuponsData.forEach(cupom => {
        cupom.produtos.forEach(produto => {
          const existing = productsMap.get(produto.nome) || {
            totalQuantity: 0,
            totalSpent: 0,
            prices: [],
            count: 0
          };
          
          existing.totalQuantity += produto.quantidade;
          existing.totalSpent += parseFloat(produto.preco.toString()) * produto.quantidade;
          existing.prices.push(parseFloat(produto.preco.toString()));
          existing.count += 1;
          
          productsMap.set(produto.nome, existing);
        });
      });

      const productsData: ProductSummary[] = Array.from(productsMap.entries())
        .map(([name, data]) => ({
          name,
          totalQuantity: data.totalQuantity,
          totalSpent: data.totalSpent,
          averagePrice: data.prices.reduce((sum, price) => sum + price, 0) / data.prices.length,
          purchaseCount: data.count
        }))
        .sort((a, b) => b.totalSpent - a.totalSpent);

      const total = purchasesData.reduce((sum, purchase) => sum + purchase.total, 0);

      setPurchases(purchasesData);
      setProducts(productsData);
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
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Store size={20} className="text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {decodeURIComponent(storeName!)}
              </h1>
              <p className="text-sm text-muted-foreground">
                {purchases.length} compras • R$ {totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="history" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="history">Histórico</TabsTrigger>
            <TabsTrigger value="products">Produtos</TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-4">
            {purchases.length === 0 ? (
              <Card className="p-8 text-center">
                <Receipt size={48} className="mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhuma compra encontrada nesta loja.</p>
              </Card>
            ) : (
              purchases.map((purchase) => (
                <Card key={purchase.id} className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar size={16} />
                      <span className="text-sm">
                        {new Date(purchase.date).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <p className="font-semibold text-primary text-lg">
                      R$ {purchase.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {purchase.products.map((product, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-foreground">
                          {product.quantidade}x {product.nome}
                        </span>
                        <span className="font-medium">
                          R$ {(product.preco * product.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            {products.length === 0 ? (
              <Card className="p-8 text-center">
                <Package size={48} className="mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum produto encontrado nesta loja.</p>
              </Card>
            ) : (
              products.map((product, index) => (
                <Card key={index} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground mb-1">{product.name}</h3>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Quantidade total: {product.totalQuantity}</p>
                        <p>Comprado {product.purchaseCount}x</p>
                        <p>Preço médio: R$ {product.averagePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary text-lg">
                        R$ {product.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-muted-foreground">Total gasto</p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        <div className="pb-20" />
      </div>
      <BottomNavigation activeTab="stores" onTabChange={handleTabChange} />
    </div>
  );
};

export default StoreDetail;