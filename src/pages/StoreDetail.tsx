import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Store, Receipt, Package, Calendar, ChevronRight, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import BottomNavigation from "@/components/Layout/BottomNavigation";
import AppLayout from "@/components/Layout/AppLayout";
import { cn } from "@/lib/utils";

interface Purchase {
  id: string;
  date: string;
  total: number;
  products: { nome: string; preco: number; quantidade: number }[];
}

interface Bill {
  id: string;
  date: string;
  total: number;
  historico: string | null;
  categoria: string | null;
  forma_pagamento: string;
}

interface ProductSummary {
  name: string;
  totalQuantity: number;
  totalSpent: number;
  averagePrice: number;
  purchaseCount: number;
}

const StoreDetailContent = () => {
  const { storeName } = useParams<{ storeName: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
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

      // Fetch purchases (cupons)
      const { data: cuponsData, error: cuponsError } = await supabase
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

      if (cuponsError) {
        console.error('Error fetching store data:', cuponsError);
        throw new Error('Falha ao carregar dados da loja');
      }

      // Fetch paid bills for this supplier
      const { data: billsData, error: billsError } = await supabase
        .from('contas_pagar')
        .select('*')
        .eq('user_id', user.id)
        .eq('fornecedor_nome', decodedStoreName)
        .eq('status', 'paga')
        .order('data_pagamento', { ascending: false });

      if (billsError) {
        console.error('Error fetching bills:', billsError);
        // Don't throw, just continue without bills
      }

      // Process purchases
      const purchasesData: Purchase[] = (cuponsData || []).map(cupom => ({
        id: cupom.id,
        date: cupom.data_compra,
        total: parseFloat(cupom.valor_total.toString()),
        products: cupom.produtos.map(p => ({
          nome: p.nome,
          preco: parseFloat(p.preco.toString()),
          quantidade: p.quantidade
        }))
      }));

      // Process bills
      const billsProcessed: Bill[] = (billsData || []).map(bill => ({
        id: bill.id,
        date: bill.data_pagamento || bill.data_vencimento,
        total: parseFloat(bill.valor.toString()),
        historico: bill.historico,
        categoria: bill.categoria_nome,
        forma_pagamento: bill.forma_pagamento || 'Não informado'
      }));

      // Calculate product summaries
      const productsMap = new Map<string, {
        totalQuantity: number;
        totalSpent: number;
        prices: number[];
        count: number;
      }>();

      (cuponsData || []).forEach(cupom => {
        cupom.produtos.forEach(produto => {
          const existing = productsMap.get(produto.nome) || {
            totalQuantity: 0,
            totalSpent: 0,
            prices: [],
            count: 0
          };
          
          existing.totalQuantity += produto.quantidade;
          existing.totalSpent += parseFloat(produto.preco.toString());
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
          averagePrice: data.totalSpent / data.totalQuantity,
          purchaseCount: data.count
        }))
        .sort((a, b) => b.totalSpent - a.totalSpent);

      // Calculate totals
      const purchasesTotal = purchasesData.reduce((sum, purchase) => sum + purchase.total, 0);
      const billsTotal = billsProcessed.reduce((sum, bill) => sum + bill.total, 0);

      setPurchases(purchasesData);
      setBills(billsProcessed);
      setProducts(productsData);
      setTotalSpent(purchasesTotal + billsTotal);
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

  const hasPurchases = purchases.length > 0;
  const hasBills = bills.length > 0;

  const getSummaryText = () => {
    const parts = [];
    if (hasPurchases) {
      parts.push(`${purchases.length} compra${purchases.length > 1 ? 's' : ''}`);
    }
    if (hasBills) {
      parts.push(`${bills.length} conta${bills.length > 1 ? 's' : ''}`);
    }
    return parts.join(' • ');
  };

  const content = (
    <div className={cn("min-h-screen bg-background", !isMobile && "p-6")}>
      <div className={cn("mx-auto", isMobile ? "max-w-4xl p-4" : "max-w-7xl")}>
        {/* Breadcrumb for desktop */}
        {!isMobile && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <button onClick={() => navigate('/stores')} className="hover:text-foreground transition-colors">
              Lojas
            </button>
            <ChevronRight size={14} />
            <span className="text-foreground font-medium">{decodeURIComponent(storeName!)}</span>
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
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              hasBills && !hasPurchases ? "bg-warning/10" : "bg-primary/10"
            )}>
              {hasPurchases && hasBills ? (
                <div className="flex -space-x-1">
                  <Store size={14} className="text-primary" />
                  <CreditCard size={14} className="text-warning" />
                </div>
              ) : hasBills ? (
                <CreditCard size={20} className="text-warning" />
              ) : (
                <Store size={20} className="text-primary" />
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {decodeURIComponent(storeName!)}
              </h1>
              <p className="text-sm text-muted-foreground">
                {getSummaryText()} • R$ {totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="history" className="space-y-6">
          <TabsList className={cn(
            "grid w-full",
            hasBills ? (isMobile ? "grid-cols-3" : "grid-cols-3 max-w-lg") : (isMobile ? "grid-cols-2" : "grid-cols-2 max-w-md")
          )}>
            <TabsTrigger value="history">
              <Receipt size={14} className="mr-1" />
              Compras
            </TabsTrigger>
            {hasBills && (
              <TabsTrigger value="bills">
                <CreditCard size={14} className="mr-1" />
                Contas
              </TabsTrigger>
            )}
            <TabsTrigger value="products">
              <Package size={14} className="mr-1" />
              Produtos
            </TabsTrigger>
          </TabsList>

          {/* Purchases Tab */}
          <TabsContent value="history" className="space-y-4">
            <div className={cn(
              !isMobile && "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            )}>
              {purchases.length === 0 ? (
                <Card className="p-8 text-center col-span-full">
                  <Receipt size={48} className="mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhuma compra encontrada nesta loja.</p>
                </Card>
              ) : (
                purchases.map((purchase) => (
                  <Card key={purchase.id} className={cn("p-4", isMobile && "mb-4")}>
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
                            R$ {product.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Bills Tab */}
          {hasBills && (
            <TabsContent value="bills" className="space-y-4">
              <div className={cn(
                !isMobile && "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              )}>
                {bills.map((bill) => (
                  <Card key={bill.id} className={cn("p-4", isMobile && "mb-4")}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar size={16} />
                        <span className="text-sm">
                          {new Date(bill.date).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <p className="font-semibold text-warning text-lg">
                        R$ {bill.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="space-y-2 text-sm">
                      {bill.historico && (
                        <p className="text-foreground">{bill.historico}</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {bill.categoria && (
                          <span className="text-xs bg-warning/10 text-warning px-2 py-1 rounded-full">
                            {bill.categoria}
                          </span>
                        )}
                        <span className="text-xs bg-muted px-2 py-1 rounded-full">
                          {bill.forma_pagamento}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>
          )}

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-4">
            <div className={cn(
              !isMobile && "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            )}>
              {products.length === 0 ? (
                <Card className="p-8 text-center col-span-full">
                  <Package size={48} className="mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhum produto encontrado nesta loja.</p>
                </Card>
              ) : (
                products.map((product, index) => (
                  <Card 
                    key={index} 
                    className={cn(
                      "p-4 cursor-pointer hover:shadow-medium transition-all",
                      isMobile && "mb-4"
                    )}
                    onClick={() => navigate(`/product/${encodeURIComponent(product.name)}`)}
                  >
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
            </div>
          </TabsContent>
        </Tabs>

        {isMobile && <div className="pb-20" />}
      </div>
      {isMobile && <BottomNavigation activeTab="stores" onTabChange={handleTabChange} />}
    </div>
  );

  // Desktop: wrap with AppLayout, Mobile: render directly
  if (isMobile) {
    return content;
  }

  return <AppLayout>{content}</AppLayout>;
};

const StoreDetail = () => {
  const isMobile = useIsMobile();

  if (isMobile === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return <StoreDetailContent />;
};

export default StoreDetail;