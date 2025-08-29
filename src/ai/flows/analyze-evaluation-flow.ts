
'use server';
/**
 * @fileOverview Flow de Análise de Sentimento de Avaliações
 * 
 * - analyzeEvaluation - Função que analisa o sentimento de um comentário de avaliação.
 * - AnalyzeEvaluationInput - O tipo de entrada para a função analyzeEvaluation.
 * - AnalyzeEvaluationOutput - O tipo de retorno para a função analyzeEvaluation.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

export const AnalyzeEvaluationInputSchema = z.object({
  rating: z.number().min(1).max(5).describe('A nota em estrelas, de 1 a 5.'),
  comment: z.string().describe('O comentário deixado pelo cliente.'),
});
export type AnalyzeEvaluationInput = z.infer<typeof AnalyzeEvaluationInputSchema>;

export const AnalyzeEvaluationOutputSchema = z.object({
  sentiment: z.enum(['Positivo', 'Negativo', 'Neutro']).describe('A classificação do sentimento do comentário.'),
  summary: z.string().describe('Um resumo conciso de uma frase do comentário.'),
});
export type AnalyzeEvaluationOutput = z.infer<typeof AnalyzeEvaluationOutputSchema>;

// Função exportada que será chamada pelo aplicativo
export async function analyzeEvaluation(input: AnalyzeEvaluationInput): Promise<AnalyzeEvaluationOutput> {
  return analyzeEvaluationFlow(input);
}


const prompt = ai.definePrompt({
  name: 'analyzeEvaluationPrompt',
  input: { schema: AnalyzeEvaluationInputSchema },
  output: { schema: AnalyzeEvaluationOutputSchema },
  prompt: `
    Você é um especialista em análise de feedback de clientes. Sua tarefa é analisar a avaliação fornecida, que consiste em uma nota de estrelas e um comentário.

    Com base na nota e no texto do comentário, faça o seguinte:
    1.  **Classifique o sentimento**: Determine se o sentimento geral da avaliação é "Positivo", "Negativo" ou "Neutro". 
        -   **Positivo**: Elogios claros, satisfação evidente, nota 4 ou 5.
        -   **Negativo**: Reclamações, insatisfação, problemas, nota 1 ou 2.
        -   **Neutro**: Comentários factuais sem emoção forte, ou avaliações com nota 3 que não pendem claramente para um lado.
    2.  **Crie um resumo**: Escreva um resumo de uma frase que capture a essência do comentário. Se não houver comentário, o resumo deve ser "Avaliação feita apenas com nota.".

    Analise a seguinte avaliação:
    -   **Nota:** {{{rating}}} de 5 estrelas
    -   **Comentário:** "{{{comment}}}"
  `,
});

const analyzeEvaluationFlow = ai.defineFlow(
  {
    name: 'analyzeEvaluationFlow',
    inputSchema: AnalyzeEvaluationInputSchema,
    outputSchema: AnalyzeEvaluationOutputSchema,
  },
  async (input) => {
    // Se o comentário for "(Sem comentário)", retorne uma análise padrão.
    if (input.comment.trim() === '(Sem comentário)') {
        let sentiment: 'Positivo' | 'Negativo' | 'Neutro' = 'Neutro';
        if (input.rating >= 4) sentiment = 'Positivo';
        if (input.rating <= 2) sentiment = 'Negativo';
        return {
            sentiment,
            summary: 'Avaliação feita apenas com nota.',
        };
    }
    
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('A análise da IA não retornou uma resposta válida.');
    }
    return output;
  }
);
