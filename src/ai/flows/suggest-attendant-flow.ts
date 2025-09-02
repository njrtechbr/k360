
'use server';
/**
 * @fileOverview Flow de Sugestão de Atendentes
 * 
 * - suggestAttendants - Função que sugere o mapeamento entre nomes de agentes de um CSV e atendentes do sistema.
 */

import { ai } from '@/ai/genkit';
import { z } from "zod";
import { Attendant } from '@/lib/types';

const SuggestAttendantInputSchema = z.object({
  agentNames: z.array(z.string()).describe("Uma lista de nomes de agentes extraídos de um arquivo CSV."),
  attendants: z.array(z.object({
      id: z.string(),
      name: z.string(),
  })).describe("A lista de atendentes cadastrados no sistema com seus IDs e nomes."),
});

const SuggestAttendantOutputSchema = z.record(z.string(), z.string().nullable().describe("O ID do atendente correspondente ou null se nenhuma correspondência for encontrada."));

export type SuggestAttendantInput = z.infer<typeof SuggestAttendantInputSchema>;
export type SuggestAttendantOutput = z.infer<typeof SuggestAttendantOutputSchema>;

export async function suggestAttendants(input: SuggestAttendantInput): Promise<SuggestAttendantOutput> {
  return suggestAttendantFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestAttendantPrompt',
  input: { schema: SuggestAttendantInputSchema },
  output: { schema: SuggestAttendantOutputSchema },
  prompt: `
    Você é um assistente de mapeamento de dados. Sua tarefa é associar nomes de "agentes" (de um arquivo de origem) aos "atendentes" corretos (do sistema).

    Analise a lista de \`agentNames\` e a lista de \`attendants\`. Para cada nome em \`agentNames\`, encontre o ID do atendente correspondente em \`attendants\`.

    Considere variações, nomes parciais, ou abreviações. Por exemplo, "Ana Flávia Felix de Souza" deve corresponder a "Ana Flávia de Souza".

    Retorne um objeto onde a chave é o nome do agente do CSV e o valor é o ID do atendente correspondente. Se você não encontrar uma correspondência clara para um agente, o valor deve ser \`null\`.

    **Nomes de Agentes do CSV:**
    {{#each agentNames}}
    - {{{this}}}
    {{/each}}

    **Atendentes do Sistema (para referência):**
    {{#each attendants}}
    - ID: {{{this.id}}}, Nome: {{{this.name}}}
    {{/each}}
  `,
});

const suggestAttendantFlow = ai.defineFlow(
  {
    name: 'suggestAttendantFlow',
    inputSchema: SuggestAttendantInputSchema,
    outputSchema: SuggestAttendantOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('A IA não retornou uma resposta válida para a sugestão de atendentes.');
    }
    return output;
  }
);
