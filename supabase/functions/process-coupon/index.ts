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
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              text: `FOQUE PRINCIPALMENTE na extração detalhada dos produtos individuais e seus preços. Analise este cupom fiscal e extraia as informações no formato JSON:

              {
                "loja_nome": "nome da loja",
                "valor_total": 0.00,
                "produtos": [
                  {
                    "nome": "nome normalizado do produto",
                    "palavras_chave": ["palavra1", "palavra2"],
                    "preco_unitario": 0.00,
                    "quantidade": 1.5,
                    "preco_total": 0.00,
                    "unidade": "un"
                  }
                ]
              }

              INSTRUÇÕES ESPECÍFICAS:
              
              1. PRODUTOS INDIVIDUAIS - FOCO PRINCIPAL:
              - Identifique CADA produto separadamente, mesmo que sejam similares
              - Para produtos idênticos comprados em quantidade > 1, mantenha como um item com quantidade correta
              - Extraia SEMPRE 2 palavras-chave principais do produto (ex: "BANANA PRATA" → ["BANANA", "PRATA"])
              
              2. PREÇOS E QUANTIDADES:
              - preco_unitario: preço de 1 unidade do produto
              - quantidade: quantos foram comprados (pode ser decimal para produtos por peso)
              - preco_total: preco_unitario × quantidade
              - Para produtos por PESO: quantidade é o peso (ex: 1.250 kg de banana)
              - Para produtos UNITÁRIOS: quantidade é o número de itens (ex: 2 sabonetes)
              
              3. UNIDADES:
              - "un" para produtos unitários (sabonete, shampoo, etc.)
              - "kg" para produtos por quilograma
              - "g" para produtos por grama
              - "ml" ou "l" para líquidos
              
              4. NORMALIZAÇÃO DE NOMES:
              - Use nomes consistentes e claros (ex: "SABONETE DOVE" ao invés de "SAB DOVE 90G")
              - Mantenha a marca quando visível
              - Para frutas/verduras: use nome comum + variedade se houver
              
              5. EXEMPLOS DE EXTRAÇÃO:
              - "2x SABONETE DOVE 90G R$ 3,50 R$ 7,00" → nome: "SABONETE DOVE", palavras_chave: ["SABONETE", "DOVE"], preco_unitario: 3.50, quantidade: 2, preco_total: 7.00, unidade: "un"
              - "BANANA PRATA 1,250 KG R$ 4,99/KG R$ 6,24" → nome: "BANANA PRATA", palavras_chave: ["BANANA", "PRATA"], preco_unitario: 4.99, quantidade: 1.25, preco_total: 6.24, unidade: "kg"
              - "LEITE INTEGRAL 1L R$ 4,50" → nome: "LEITE INTEGRAL", palavras_chave: ["LEITE", "INTEGRAL"], preco_unitario: 4.50, quantidade: 1, preco_total: 4.50, unidade: "l"
              
              6. VALIDAÇÕES:
              - Use valores numéricos para preços (não strings)
              - Certifique-se que preco_unitario × quantidade ≈ preco_total
              - Se não conseguir identificar produtos individuais claramente, tente ao máximo extrair pelo menos o nome e valor
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