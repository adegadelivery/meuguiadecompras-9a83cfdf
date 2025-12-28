import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, CreditCard, Calendar, Loader2, Trash2, Check, Edit } from "lucide-react";
import { format, parseISO, isAfter, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import BillForm from "./BillForm";

interface Bill {
  id: string;
  fornecedor_nome: string;
  valor: number;
  data_vencimento: string;
  data_emissao: string;
  historico: string | null;
  forma_pagamento: string;
  categoria_nome: string;
  status: string;
  data_pagamento: string | null;
}

interface BillsViewProps {
  isDesktop?: boolean;
}

const BillsView = ({ isDesktop = false }: BillsViewProps) => {
  const { user } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);

  useEffect(() => {
    if (user) {
      fetchBills();
    }
  }, [user]);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("contas_pagar")
        .select("*")
        .order("data_vencimento", { ascending: true });

      if (error) throw error;

      // Update status for overdue bills
      const today = startOfDay(new Date());
      const updatedBills = (data || []).map((bill) => {
        if (bill.status === "em_aberto" && isBefore(parseISO(bill.data_vencimento), today)) {
          return { ...bill, status: "atrasada" };
        }
        return bill;
      });

      setBills(updatedBills);
    } catch (error) {
      console.error("Error fetching bills:", error);
      toast({
        title: "Erro ao carregar contas",
        description: "Não foi possível carregar as contas a pagar.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (billId: string) => {
    try {
      const { error } = await supabase
        .from("contas_pagar")
        .update({ status: "paga", data_pagamento: new Date().toISOString() })
        .eq("id", billId);

      if (error) throw error;

      toast({
        title: "Conta paga!",
        description: "A conta foi marcada como paga.",
      });
      fetchBills();
    } catch (error) {
      console.error("Error marking bill as paid:", error);
      toast({
        title: "Erro",
        description: "Não foi possível marcar a conta como paga.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (billId: string) => {
    try {
      const { error } = await supabase.from("contas_pagar").delete().eq("id", billId);

      if (error) throw error;

      toast({
        title: "Conta excluída",
        description: "A conta foi removida com sucesso.",
      });
      fetchBills();
    } catch (error) {
      console.error("Error deleting bill:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a conta.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (bill: Bill) => {
    setEditingBill(bill);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingBill(null);
  };

  const handleFormSuccess = () => {
    handleFormClose();
    fetchBills();
  };

  const filteredBills = bills.filter((bill) => {
    const matchesSearch =
      bill.fornecedor_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (bill.historico && bill.historico.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "all" || bill.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalValue = filteredBills.reduce((sum, bill) => sum + Number(bill.valor), 0);
  const openBills = filteredBills.filter((b) => b.status === "em_aberto").length;
  const overdueBills = filteredBills.filter((b) => b.status === "atrasada").length;
  const paidBills = filteredBills.filter((b) => b.status === "paga").length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "em_aberto":
        return <Badge className="bg-primary/10 text-primary border-primary/20">Em aberto</Badge>;
      case "atrasada":
        return <Badge variant="destructive">Atrasada</Badge>;
      case "paga":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Paga</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={`flex-1 ${isDesktop ? "p-6" : "p-4 pb-24"} space-y-4`}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-bold text-foreground">Contas a Pagar</h2>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Conta
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingBill ? "Editar Conta" : "Nova Conta a Pagar"}</DialogTitle>
            </DialogHeader>
            <BillForm
              onSuccess={handleFormSuccess}
              onCancel={handleFormClose}
              editingBill={editingBill}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className={`grid gap-3 ${isDesktop ? "grid-cols-4" : "grid-cols-2"}`}>
        <Card className="bg-card">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-lg font-bold text-foreground">{formatCurrency(totalValue)}</p>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <p className="text-sm text-primary">Em Aberto</p>
            <p className="text-lg font-bold text-primary">{openBills}</p>
          </CardContent>
        </Card>
        <Card className="bg-destructive/5 border-destructive/20">
          <CardContent className="p-4">
            <p className="text-sm text-destructive">Atrasadas</p>
            <p className="text-lg font-bold text-destructive">{overdueBills}</p>
          </CardContent>
        </Card>
        <Card className="bg-green-500/5 border-green-500/20">
          <CardContent className="p-4">
            <p className="text-sm text-green-600">Pagas</p>
            <p className="text-lg font-bold text-green-600">{paidBills}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por fornecedor ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="em_aberto">Em aberto</SelectItem>
            <SelectItem value="atrasada">Atrasadas</SelectItem>
            <SelectItem value="paga">Pagas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bills List */}
      {filteredBills.length === 0 ? (
        <Card className="p-8 text-center">
          <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nenhuma conta encontrada</p>
          <p className="text-sm text-muted-foreground mt-1">
            Clique em "Nova Conta" para adicionar uma conta a pagar
          </p>
        </Card>
      ) : isDesktop ? (
        // Desktop Table View
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Fornecedor</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Histórico</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Vencimento</th>
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">Valor</th>
                  <th className="text-center p-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-center p-4 text-sm font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredBills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-4">
                      <p className="font-medium text-foreground">{bill.fornecedor_nome}</p>
                      <p className="text-xs text-muted-foreground">{bill.categoria_nome}</p>
                    </td>
                    <td className="p-4 text-muted-foreground max-w-[200px] truncate">
                      {bill.historico || "-"}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {format(parseISO(bill.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                    </td>
                    <td className="p-4 text-right font-semibold text-foreground">
                      {formatCurrency(Number(bill.valor))}
                    </td>
                    <td className="p-4 text-center">{getStatusBadge(bill.status)}</td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        {bill.status !== "paga" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleMarkAsPaid(bill.id)}
                            title="Marcar como paga"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => handleEdit(bill)}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(bill.id)}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        // Mobile Card View
        <div className="space-y-3">
          {filteredBills.map((bill) => (
            <Card key={bill.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-foreground">{bill.fornecedor_nome}</p>
                    <p className="text-xs text-muted-foreground">{bill.categoria_nome}</p>
                  </div>
                  {getStatusBadge(bill.status)}
                </div>
                {bill.historico && (
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{bill.historico}</p>
                )}
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-border">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {format(parseISO(bill.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}
                  </div>
                  <p className="font-bold text-foreground">{formatCurrency(Number(bill.valor))}</p>
                </div>
                <div className="flex gap-2 mt-3">
                  {bill.status !== "paga" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-green-600 border-green-200 hover:bg-green-50"
                      onClick={() => handleMarkAsPaid(bill.id)}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Pagar
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => handleEdit(bill)}>
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive border-destructive/20 hover:bg-destructive/10"
                    onClick={() => handleDelete(bill.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default BillsView;
