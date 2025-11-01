import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting coupon processing...');
    
    const { imageBase64, userId, fileType = 'image' } = await req.json();
    
    if (!imageBase64) {
      console.error('Missing file data');
      return new Response(JSON.stringify({ error: 'File data is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!userId) {
      console.error('Missing user ID');
      return new Response(JSON.stringify({ error: 'User authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      console.error('Gemini API key not configured');
      return new Response(JSON.stringify({ error: 'Gemini API not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Sending image to Gemini API...');
    
    // Process image with Gemini (using latest version)
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              text: `Você é um assistente de extração de dados de alta precisão para um aplicativo de finanças pessoais. 
Analise este cupom fiscal brasileiro e extraia as informações em JSON.

REGRAS CRÍTICAS DE EXTRAÇÃO:

1. NOME DA LOJA:
   - Procure o nome do estabelecimento no CABEÇALHO do cupom
   - NUNCA retorne "Loja Desconhecida" se o nome estiver visível
   - Se realmente não conseguir identificar, use "Loja não identificada"

2. VALOR TOTAL PAGO:
   - Procure por "VALOR PAGO" ou "TOTAL" na parte inferior do cupom
   - Este é o valor final que o cliente pagou

3. PRODUTOS (REGRA MAIS IMPORTANTE):
   - O cupom tem colunas: DESCRICAO, QTDE, UN, VL UNIT, VL TOTAL
   - ⚠️ ATENÇÃO: NÃO confunda VL UNIT com VL TOTAL!
   - VL UNIT = preço unitário (por unidade/kg) - NÃO use este para preco_total
   - VL TOTAL = preço total da linha (QTDE × VL UNIT) - USE ESTE para preco_total
   - Você DEVE extrair:
     * nome: texto da coluna DESCRICAO
     * quantidade: valor da coluna QTDE
     * preco_unitario: valor da coluna VL UNIT
     * preco_total: valor da coluna VL TOTAL (o valor mais à direita na linha)
     * unidade: valor da coluna UN (un, kg, g, l, ml)
     * palavras_chave: 2 palavras principais do produto para busca

FORMATO JSON EXATO:

{
  "loja_nome": "NOME DO ESTABELECIMENTO",
  "valor_total": 87.54,
  "produtos": [
    {
      "nome": "AGUA MINERAL",
      "palavras_chave": ["AGUA", "MINERAL"],
      "preco_unitario": 0.79,
      "quantidade": 12,
      "preco_total": 9.48,
      "unidade": "un"
    },
    {
      "nome": "COXA DE FRANGO",
      "palavras_chave": ["COXA", "FRANGO"],
      "preco_unitario": 34.90,
      "quantidade": 0.534,
      "preco_total": 18.63,
      "unidade": "kg"
    }
  ]
}

VALIDAÇÕES:
- Use valores numéricos para preços (não strings)
- Verifique: preco_unitario × quantidade ≈ preco_total
- Extraia TODOS os produtos da lista
- Responda APENAS com o JSON, sem texto adicional`
            },
            {
              inline_data: {
                mime_type: fileType === 'pdf' ? "application/pdf" : "image/jpeg",
                data: imageBase64.replace(/^data:(image\/[a-z]+|application\/pdf);base64,/, '')
              }
            }
          ]
        }]
      }),
    });

    if (!geminiResponse.ok) {
      console.error('Gemini API error:', await geminiResponse.text());
      throw new Error('Failed to process image with Gemini');
    }

    const geminiData = await geminiResponse.json();
    console.log('Gemini response:', geminiData);

    if (!geminiData.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response from Gemini API');
    }

    const responseText = geminiData.candidates[0].content.parts[0].text;
    console.log('Gemini response text:', responseText);
    
    // Parse JSON from Gemini response
    let couponData;
    try {
      // Clean the response text to extract only the JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        couponData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in Gemini response');
      }
    } catch (parseError) {
      console.error('Failed to parse Gemini JSON response:', parseError);
      throw new Error('Invalid JSON response from Gemini');
    }

    console.log('Parsed coupon data:', couponData);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Save coupon to database
    const { data: cupomData, error: cupomError } = await supabase
      .from('cupons')
      .insert({
        user_id: userId,
        loja_nome: couponData.loja_nome || 'Loja não identificada',
        valor_total: couponData.valor_total || 0,
        data_compra: new Date().toISOString(),
      })
      .select()
      .single();

    if (cupomError) {
      console.error('Error saving coupon:', cupomError);
      throw new Error('Failed to save coupon data');
    }

    console.log('Coupon saved:', cupomData);

    // Save products if they exist
    if (couponData.produtos && Array.isArray(couponData.produtos) && couponData.produtos.length > 0) {
      const produtosToInsert = couponData.produtos.map((produto: any) => ({
        cupom_id: cupomData.id,
        nome: produto.nome || 'Produto sem nome',
        preco: produto.preco_total || produto.preco || 0,
        preco_unitario: produto.preco_unitario || produto.preco || 0,
        quantidade: produto.quantidade || 1,
        unidade: produto.unidade || 'un',
        palavras_chave: produto.palavras_chave || [],
      }));

      console.log('Products to insert:', produtosToInsert);

      const { error: produtosError } = await supabase
        .from('produtos')
        .insert(produtosToInsert);

      if (produtosError) {
        console.error('Error saving products:', produtosError);
        // Don't throw error, coupon is already saved
      } else {
        console.log('Products saved successfully with enhanced data');
      }
    }

    console.log('Coupon processing completed successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      cupom: cupomData,
      message: 'Cupom processado com sucesso!'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-coupon function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to process coupon',
      details: 'Check function logs for more information'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});