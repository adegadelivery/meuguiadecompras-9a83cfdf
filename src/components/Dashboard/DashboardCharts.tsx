import { Card } from "@/components/ui/card";
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { TrendingUp, BarChart3, PieChart as PieChartIcon } from "lucide-react";

interface DashboardChartsProps {
  spendingTrend: { date: string; total: number }[];
  categoryData: { name: string; total: number }[];
  storeShare: { name: string; total: number }[];
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--info))',
  'hsl(var(--muted-foreground))',
];

const DashboardCharts = ({ spendingTrend, categoryData, storeShare }: DashboardChartsProps) => {
  // Process store data for pie chart (top 5 + others)
  const processedStoreData = () => {
    const sorted = [...storeShare].sort((a, b) => b.total - a.total);
    if (sorted.length <= 5) return sorted;
    
    const top5 = sorted.slice(0, 5);
    const othersTotal = sorted.slice(5).reduce((sum, s) => sum + s.total, 0);
    
    if (othersTotal > 0) {
      return [...top5, { name: 'Outros', total: othersTotal }];
    }
    return top5;
  };

  const pieData = processedStoreData();

  const formatCurrency = (value: number) => 
    `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* Spending Trend - Line Chart */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4 flex items-center">
          <TrendingUp size={18} className="mr-2 text-primary" />
          Tendência de Gastos
        </h3>
        <div className="h-[300px]">
          {spendingTrend.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Nenhum dado disponível no período
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spendingTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  tickFormatter={(value) => `R$${value}`}
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Total']}
                  labelFormatter={(label) => `Data: ${formatDate(label)}`}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Grid for Bar and Pie charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Comparison - Bar Chart */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center">
            <BarChart3 size={18} className="mr-2 text-accent" />
            Gastos por Categoria
          </h3>
          <div className="h-[250px]">
            {categoryData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Nenhuma categoria encontrada
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    type="number" 
                    tickFormatter={(value) => `R$${value}`}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={100}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Total']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar 
                    dataKey="total" 
                    fill="hsl(var(--accent))"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Store Share - Pie Chart */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center">
            <PieChartIcon size={18} className="mr-2 text-success" />
            Gastos por Loja
          </h3>
          <div className="h-[250px]">
            {pieData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Nenhuma loja encontrada
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="total"
                    nameKey="name"
                    label={({ name, percent }) => 
                      `${name.substring(0, 10)}${name.length > 10 ? '...' : ''} (${(percent * 100).toFixed(0)}%)`
                    }
                    labelLine={{ strokeWidth: 1 }}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Total']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DashboardCharts;
