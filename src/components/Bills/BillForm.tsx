import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

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
}

interface BillFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  editingBill?: Bill | null;
}

interface Categoria {
  id: string;
  nome: string;
}

interface Fornecedor {
  id: string;
  nome: string;
}

const formasPagamento = [
  "Dinheiro",
  "Cartão de Crédito",
  "Cartão de Débito",
  "PIX",
  "Boleto",
  "Transferência",
  "Cheque",
];

const contasFinanceiras = ["Caixa", "Banco", "Carteira Digital", "Conta Corrente", "Poupança"];

const BillForm = ({ onSuccess, onCancel, editingBill }: BillFormProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);

  const [formData, setFormData] = useState({
    fornecedor_nome: editingBill?.fornecedor_nome || "",
    valor: editingBill?.valor?.toString() || "",
    data_emissao: editingBill?.data_emissao || format(new Date(), "yyyy-MM-dd"),
    data_competencia: format(new Date(), "yyyy-MM-dd"),
    data_vencimento: editingBill?.data_vencimento || "",
    historico: editingBill?.historico || "",
    forma_pagamento: editingBill?.forma_pagamento || "Dinheiro",
    conta_financeira: "Caixa",
    categoria_nome: editingBill?.categoria_nome || "Sem categoria",
    numero_documento: "",
  });

  useEffect(() => {
    if (user) {
      fetchFornecedores();
      fetchCategorias();
    }
  }, [user]);

  const fetchFornecedores = async () => {
    const { data } = await supabase.from("fornecedores").select("id, nome").order("nome");
    if (data) setFornecedores(data);
  };

  const fetchCategorias = async () => {
    const { data } = await supabase.from("categorias_financeiras").select("id, nome").order("nome");
    if (data) setCategorias(data);
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (saveAndPay: boolean = false) => {
    if (!user) return;

    if (!formData.fornecedor_nome.trim()) {
      toast({
        title: "Erro",
        description: "Informe o fornecedor.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.valor || Number(formData.valor) <= 0) {
      toast({
        title: "Erro",
        description: "Informe um valor válido.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.data_vencimento) {
      toast({
        title: "Erro",
        description: "Informe a data de vencimento.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Check if fornecedor exists, if not create it
      let fornecedorId = null;
      const existingFornecedor = fornecedores.find(
        (f) => f.nome.toLowerCase() === formData.fornecedor_nome.toLowerCase()
      );

      if (existingFornecedor) {
        fornecedorId = existingFornecedor.id;
      } else {
        const { data: newFornecedor, error: fornecedorError } = await supabase
          .from("fornecedores")
          .insert({ nome: formData.fornecedor_nome, user_id: user.id })
          .select("id")
          .single();

        if (fornecedorError && !fornecedorError.message.includes("duplicate")) {
          throw fornecedorError;
        }
        if (newFornecedor) {
          fornecedorId = newFornecedor.id;
        }
      }

      // Check if categoria exists, if not create it
      let categoriaId = null;
      if (formData.categoria_nome && formData.categoria_nome !== "Sem categoria") {
        const existingCategoria = categorias.find(
          (c) => c.nome.toLowerCase() === formData.categoria_nome.toLowerCase()
        );

        if (existingCategoria) {
          categoriaId = existingCategoria.id;
        } else {
          const { data: newCategoria, error: categoriaError } = await supabase
            .from("categorias_financeiras")
            .insert({ nome: formData.categoria_nome, user_id: user.id })
            .select("id")
            .single();

          if (categoriaError && !categoriaError.message.includes("duplicate")) {
            throw categoriaError;
          }
          if (newCategoria) {
            categoriaId = newCategoria.id;
          }
        }
      }

      const billData = {
        user_id: user.id,
        fornecedor_id: fornecedorId,
        fornecedor_nome: formData.fornecedor_nome,
        valor: Number(formData.valor),
        data_emissao: formData.data_emissao,
        data_competencia: formData.data_competencia,
        data_vencimento: formData.data_vencimento,
        historico: formData.historico || null,
        forma_pagamento: formData.forma_pagamento,
        conta_financeira: formData.conta_financeira,
        categoria_id: categoriaId,
        categoria_nome: formData.categoria_nome || "Sem categoria",
        numero_documento: formData.numero_documento || null,
        status: saveAndPay ? "paga" : "em_aberto",
        data_pagamento: saveAndPay ? new Date().toISOString() : null,
      };

      if (editingBill) {
        const { error } = await supabase
          .from("contas_pagar")
          .update(billData)
          .eq("id", editingBill.id);

        if (error) throw error;

        toast({
          title: "Conta atualizada!",
          description: "A conta foi atualizada com sucesso.",
        });
      } else {
        const { error } = await supabase.from("contas_pagar").insert(billData);

        if (error) throw error;

        toast({
          title: saveAndPay ? "Conta paga!" : "Conta criada!",
          description: saveAndPay
            ? "A conta foi salva e marcada como paga."
            : "A conta foi adicionada com sucesso.",
        });
      }

      onSuccess();
    } catch (error) {
      console.error("Error saving bill:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a conta.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Fornecedor */}
        <div className="space-y-2">
          <Label htmlFor="fornecedor">Fornecedor *</Label>
          <Input
            id="fornecedor"
            placeholder="Nome do fornecedor"
            value={formData.fornecedor_nome}
            onChange={(e) => handleChange("fornecedor_nome", e.target.value)}
            list="fornecedores-list"
          />
          <datalist id="fornecedores-list">
            {fornecedores.map((f) => (
              <option key={f.id} value={f.nome} />
            ))}
          </datalist>
        </div>

        {/* Valor */}
        <div className="space-y-2">
          <Label htmlFor="valor">Valor (R$) *</Label>
          <Input
            id="valor"
            type="number"
            step="0.01"
            min="0"
            placeholder="0,00"
            value={formData.valor}
            onChange={(e) => handleChange("valor", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Data Emissão */}
        <div className="space-y-2">
          <Label htmlFor="data_emissao">Data de Emissão *</Label>
          <Input
            id="data_emissao"
            type="date"
            value={formData.data_emissao}
            onChange={(e) => handleChange("data_emissao", e.target.value)}
          />
        </div>

        {/* Data Competência */}
        <div className="space-y-2">
          <Label htmlFor="data_competencia">Data de Competência *</Label>
          <Input
            id="data_competencia"
            type="date"
            value={formData.data_competencia}
            onChange={(e) => handleChange("data_competencia", e.target.value)}
          />
        </div>

        {/* Data Vencimento */}
        <div className="space-y-2">
          <Label htmlFor="data_vencimento">Data de Vencimento *</Label>
          <Input
            id="data_vencimento"
            type="date"
            value={formData.data_vencimento}
            onChange={(e) => handleChange("data_vencimento", e.target.value)}
          />
        </div>
      </div>

      {/* Histórico */}
      <div className="space-y-2">
        <Label htmlFor="historico">Histórico / Descrição</Label>
        <Textarea
          id="historico"
          placeholder="Descrição da conta..."
          value={formData.historico}
          onChange={(e) => handleChange("historico", e.target.value)}
          rows={3}
        />
      </div>

      <div className="border-t border-border pt-4">
        <p className="text-sm font-medium text-muted-foreground mb-3">Informações de Pagamento</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Forma de Pagamento */}
          <div className="space-y-2">
            <Label>Forma de Pagamento</Label>
            <Select
              value={formData.forma_pagamento}
              onValueChange={(value) => handleChange("forma_pagamento", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {formasPagamento.map((forma) => (
                  <SelectItem key={forma} value={forma}>
                    {forma}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Conta Financeira */}
          <div className="space-y-2">
            <Label>Conta Financeira</Label>
            <Select
              value={formData.conta_financeira}
              onValueChange={(value) => handleChange("conta_financeira", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {contasFinanceiras.map((conta) => (
                  <SelectItem key={conta} value={conta}>
                    {conta}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Categoria */}
        <div className="space-y-2">
          <Label htmlFor="categoria">Categoria</Label>
          <Input
            id="categoria"
            placeholder="Ex: Aluguel, Energia, etc."
            value={formData.categoria_nome}
            onChange={(e) => handleChange("categoria_nome", e.target.value)}
            list="categorias-list"
          />
          <datalist id="categorias-list">
            {categorias.map((c) => (
              <option key={c.id} value={c.nome} />
            ))}
          </datalist>
        </div>

        {/* Número Documento */}
        <div className="space-y-2">
          <Label htmlFor="numero_documento">Nº do Documento</Label>
          <Input
            id="numero_documento"
            placeholder="Opcional"
            value={formData.numero_documento}
            onChange={(e) => handleChange("numero_documento", e.target.value)}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-border">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        {!editingBill && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleSubmit(true)}
            disabled={loading}
            className="flex-1 sm:flex-initial"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Salvar e dar baixa
          </Button>
        )}
        <Button
          type="button"
          onClick={() => handleSubmit(false)}
          disabled={loading}
          className="flex-1 sm:flex-initial"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Salvar
        </Button>
      </div>
    </div>
  );
};

export default BillForm;
