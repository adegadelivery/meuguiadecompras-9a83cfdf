import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BarChart3, Calendar as CalendarIcon, Receipt, DollarSign, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import TransactionModal from "./TransactionModal";

interface HistoryItem {
  id?: string;
  type: 'purchase' | 'bill';
  date: string;
  store: string;
  total: number;
  items: string[];
  category?: string;
}

interface AnalysisViewProps {
  isDesktop?: boolean;
}

interface DateRange {
  from: Date;
  to: Date;
}

const AnalysisView = ({ isDesktop = false }: AnalysisViewProps) => {
  const [activeFilter, setActiveFilter] = useState("7days");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPeriod, setTotalPeriod] = useState(0);
  const [avgPurchase, setAvgPurchase] = useState(0);
  const { toast } = useToast();

  // Custom date range
  const [customDateRange, setCustomDateRange] = useState<DateRange | null>(null);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  // Transaction modal
  const [selectedTransaction, setSelectedTransaction] = useState<HistoryItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const filters = [
    { id: "today", label: "Hoje", days: 0 },
    { id: "yesterday", label: "Ontem", days: 1 },
    { id: "7days", label: "7 Dias", days: 7 },
    { id: "30days", label: "30 Dias", days: 30 },
    { id: "90days", label: "90 Dias", days: 90 },
    { id: "180days", label: "180 Dias", days: 180 },
    { id: "365days", label: "1 Ano", days: 365 },
  ];

  useEffect(() => {
    fetchAnalysisData();
  }, [activeFilter, customDateRange]);

  const getDateRange = (days: number): { start: Date; end: Date } => {
    const now = new Date();
    
    if (days === 0) {
      const startLocal = new Date();
      startLocal.setHours(0, 0, 0, 0);
      const endExclusiveLocal = new Date();
      endExclusiveLocal.setDate(endExclusiveLocal.getDate() + 1);
      endExclusiveLocal.setHours(0, 0, 0, 0);
      return { start: startLocal, end: endExclusiveLocal };
    } else if (days === 1) {
      const startLocal = new Date();
      startLocal.setDate(startLocal.getDate() - 1);
      startLocal.setHours(0, 0, 0, 0);
      const endExclusiveLocal = new Date();
      endExclusiveLocal.setHours(0, 0, 0, 0);
      return { start: startLocal, end: endExclusiveLocal };
    } else {
      const startLocal = new Date();
      startLocal.setDate(startLocal.getDate() - days);
      startLocal.setHours(0, 0, 0, 0);
      const endExclusiveLocal = new Date();
      return { start: startLocal, end: endExclusiveLocal };
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

      let start: Date;
      let end: Date;

      if (activeFilter === 'custom' && customDateRange) {
        start = customDateRange.from;
        end = new Date(customDateRange.to);
        end.setDate(end.getDate() + 1); // Include the end date
      } else {
        const currentFilter = filters.find(f => f.id === activeFilter);
        const range = getDateRange(currentFilter?.days ?? 7);
        start = range.start;
        end = range.end;
      }

      // Fetch cupons with id for drill-down
      const { data: cuponsData, error: cuponsError } = await supabase
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
        .lt('data_compra', end.toISOString())
        .order('data_compra', { ascending: false });

      if (cuponsError) {
        console.error('Error fetching cupons:', cuponsError);
        throw new Error('Falha ao carregar dados de compras');
      }

      // Fetch paid bills
      const { data: billsData, error: billsError } = await supabase
        .from('contas_pagar')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'paga')
        .not('data_pagamento', 'is', null)
        .gte('data_pagamento', start.toISOString())
        .lt('data_pagamento', end.toISOString())
        .order('data_pagamento', { ascending: false });

      if (billsError) {
        console.error('Error fetching bills:', billsError);
        throw new Error('Falha ao carregar dados de contas');
      }

      // Process cupons into history items with id
      const purchasesHistory: HistoryItem[] = (cuponsData || [])
        .map(cupom => ({
          id: cupom.id,
          type: 'purchase' as const,
          date: cupom.data_compra,
          store: cupom.loja_nome,
          total: parseFloat(cupom.valor_total.toString()),
          items: cupom.produtos.map(p => p.nome)
        }))
        .filter(purchase => {
          const purchaseDate = new Date(purchase.date);
          return purchaseDate >= start && purchaseDate < end;
        });

      // Process bills into history items
      const billsHistory: HistoryItem[] = (billsData || [])
        .map(bill => ({
          id: bill.id,
          type: 'bill' as const,
          date: bill.data_pagamento!,
          store: bill.fornecedor_nome,
          total: parseFloat(bill.valor.toString()),
          items: bill.historico ? [bill.historico] : [],
          category: bill.categoria_nome || undefined
        }))
        .filter(bill => {
          const billDate = new Date(bill.date);
          return billDate >= start && billDate < end;
        });

      // Combine and sort by date
      const allHistory = [...purchasesHistory, ...billsHistory]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const total = allHistory.reduce((sum, item) => sum + item.total, 0);
      const avg = allHistory.length > 0 ? total / allHistory.length : 0;

      setHistory(allHistory);
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

  const handleTransactionClick = (item: HistoryItem) => {
    setSelectedTransaction(item);
    setModalOpen(true);
  };

  const handleCustomDateSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range?.from && range?.to) {
      setCustomDateRange({ from: range.from, to: range.to });
      setActiveFilter('custom');
      setDatePopoverOpen(false);
    }
  };

  const getActiveLabel = () => {
    if (activeFilter === 'custom' && customDateRange) {
      return `${format(customDateRange.from, 'dd/MM', { locale: ptBR })} - ${format(customDateRange.to, 'dd/MM', { locale: ptBR })}`;
    }
    return filters.find(f => f.id === activeFilter)?.label || '';
  };

  return (
    <div className={cn("flex-1", isDesktop ? "" : "px-4 py-6")}>
      {!isDesktop && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">Análise de Gastos</h1>
          <p className="text-muted-foreground">
            Acompanhe seu histórico de gastos
          </p>
        </div>
      )}

      {/* Filter buttons */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 flex-wrap">
        {filters.map((filter) => (
          <Button
            key={filter.id}
            variant={activeFilter === filter.id ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setActiveFilter(filter.id);
              setCustomDateRange(null);
            }}
            className="whitespace-nowrap"
          >
            {filter.label}
          </Button>
        ))}
        
        {/* Custom date picker */}
        <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant={activeFilter === 'custom' ? "default" : "outline"}
              size="sm"
              className="whitespace-nowrap"
            >
              <CalendarIcon size={14} className="mr-1" />
              {activeFilter === 'custom' && customDateRange 
                ? getActiveLabel()
                : 'Personalizado'
              }
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={customDateRange ? { from: customDateRange.from, to: customDateRange.to } : undefined}
              onSelect={handleCustomDateSelect}
              locale={ptBR}
              numberOfMonths={isDesktop ? 2 : 1}
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Stats cards */}
      <div className={cn(
        "grid gap-4 mb-6",
        isDesktop ? "grid-cols-2 md:grid-cols-4 max-w-4xl" : "grid-cols-2"
      )}>
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

        {isDesktop && (
          <>
            <Card className="p-4 shadow-soft">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-success/10 rounded-lg flex items-center justify-center">
                  <Receipt size={16} className="text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Registros</p>
                  <p className="font-semibold text-lg">
                    {loading ? "..." : history.length}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4 shadow-soft">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-info/10 rounded-lg flex items-center justify-center">
                  <CalendarIcon size={16} className="text-info" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Período</p>
                  <p className="font-semibold text-lg">
                    {getActiveLabel()}
                  </p>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* History list */}
      <Card className={cn("p-4 shadow-soft mb-4", isDesktop && "max-w-4xl")}>
        <h3 className="font-semibold mb-4 flex items-center">
          <Receipt size={18} className="mr-2 text-primary" />
          Histórico de Gastos
        </h3>
        <div className={cn(
          isDesktop ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-4"
        )}>
          {loading ? (
            [1, 2, 3, 4].map((i) => (
              <div key={i} className="border-b border-border/50 pb-4 animate-pulse">
                <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/3 mb-2"></div>
                <div className="flex gap-2">
                  <div className="h-6 bg-muted rounded w-16"></div>
                  <div className="h-6 bg-muted rounded w-20"></div>
                </div>
              </div>
            ))
          ) : history.length === 0 ? (
            <div className="text-center py-8 col-span-full">
              <Receipt size={48} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2 font-medium">
                Nenhum gasto encontrado
              </p>
              <p className="text-sm text-muted-foreground">
                Não há registros para o período selecionado.
              </p>
            </div>
          ) : (
            history.map((item, index) => (
              <div 
                key={`${item.type}-${item.id || index}`} 
                className={cn(
                  "pb-4 cursor-pointer transition-colors hover:bg-muted/50 rounded-lg",
                  !isDesktop && "border-b border-border/50 last:border-b-0",
                  isDesktop && "bg-muted/30 p-4"
                )}
                onClick={() => handleTransactionClick(item)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-start gap-2">
                    <div className={cn(
                      "w-6 h-6 rounded flex items-center justify-center mt-0.5",
                      item.type === 'purchase' ? "bg-primary/10" : "bg-warning/10"
                    )}>
                      {item.type === 'purchase' ? (
                        <Receipt size={14} className="text-primary" />
                      ) : (
                        <CreditCard size={14} className="text-warning" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{item.store}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.date).toLocaleDateString('pt-BR')}
                        {item.type === 'bill' && item.category && (
                          <span className="ml-2 text-warning">• {item.category}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold text-primary">
                    R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                {item.items.length > 0 && (
                  <div className="flex flex-wrap gap-1 ml-8">
                    {item.items.slice(0, isDesktop ? 5 : 3).map((itemName, itemIndex) => (
                      <span 
                        key={itemIndex}
                        className={cn(
                          "text-xs px-2 py-1 rounded-full",
                          item.type === 'purchase' ? "bg-muted" : "bg-warning/10 text-warning"
                        )}
                      >
                        {itemName}
                      </span>
                    ))}
                    {item.items.length > (isDesktop ? 5 : 3) && (
                      <span className="text-xs text-muted-foreground px-2 py-1">
                        +{item.items.length - (isDesktop ? 5 : 3)} mais
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Card>

      {!isDesktop && <div className="pb-20" />}

      {/* Transaction details modal */}
      <TransactionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        transaction={selectedTransaction}
      />
    </div>
  );
};

export default AnalysisView;
