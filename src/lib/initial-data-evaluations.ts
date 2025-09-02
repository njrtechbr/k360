
import type { Evaluation } from './types';
import { getScoreFromRating } from '@/hooks/useGamificationData';

const INITIAL_RATING_SCORES = { '1': -5, '2': -2, '3': 1, '4': 3, '5': 5 };

const parseEvaluationDate = (dateString: string) => {
    const parts = dateString.split(/[\s/:]/);
    if (parts.length < 3) return new Date(0).toISOString();
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const hours = parts.length > 3 ? parseInt(parts[3], 10) : 0;
    const minutes = parts.length > 4 ? parseInt(parts[4], 10) : 0;
    const seconds = parts.length > 5 ? parseInt(parts[5], 10) : 0;
    return new Date(year, month, day, hours, minutes, seconds).toISOString();
};

const INITIAL_EVALUATIONS_RAW = [
    { "id": "6002ff6d-ac09-4c64-95b3-e5987cc0b841", "attendantId": "58cd3a1d-9214-4535-b8d8-6f9d9957a570", "nota": 5, "comentario": "(Sem comentário)", "data": "05/08/2025 11:13:58" },
    { "id": "18944d44-1d1d-4d96-9411-93285fffde2d", "attendantId": "8773973a-9a4e-436e-bd93-37150645852b", "nota": 5, "comentario": "(Sem comentário)", "data": "06/08/2025 20:09:07" },
    { "id": "94cad7d2-6d5b-45c6-9f1d-cdfcdeb179a5", "attendantId": "8773973a-9a4e-436e-bd93-37150645852b", "nota": 5, "comentario": "(Sem comentário)", "data": "06/08/2025 20:09:34" },
    { "id": "5aae7ce4-502c-4df8-a8dc-567e11b0b1ff", "attendantId": "8773973a-9a4e-436e-bd93-37150645852b", "nota": 5, "comentario": "(Sem comentário)", "data": "07/08/2025 17:58:05" },
    { "id": "59a8effa-51ff-46d6-b243-ca79413b7d0a", "attendantId": "8773973a-9a4e-436e-bd93-37150645852b", "nota": 5, "comentario": "Ótimo atendimento.", "data": "07/08/2025 18:21:28" },
    { "id": "1835bf47-1879-4353-8a11-9c78095d870c", "attendantId": "8773973a-9a4e-436e-bd93-37150645852b", "nota": 1, "comentario": "(Sem comentário)", "data": "07/08/2025 18:26:46" },
    { "id": "89dcc97b-50ea-4333-aa10-7250549ab839", "attendantId": "8773973a-9a4e-436e-bd93-37150645852b", "nota": 5, "comentario": "(Sem comentário)", "data": "07/08/2025 18:27:38" },
    { "id": "7bf765c6-6d9d-4631-bb96-f85a7401919c", "attendantId": "8773973a-9a4e-436e-bd93-37150645852b", "nota": 5, "comentario": "(Sem comentário)", "data": "07/08/2025 18:28:03" },
    { "id": "79b04737-80ac-4d0a-b70c-2f2906b0ad3b", "attendantId": "8773973a-9a4e-436e-bd93-37150645852b", "nota": 5, "comentario": "(Sem comentário)", "data": "07/08/2025 18:28:06" },
    { "id": "ba1bf906-4760-459b-9ee5-30a2880f85cc", "attendantId": "8773973a-9a4e-436e-bd93-37150645852b", "nota": 5, "comentario": "(Sem comentário)", "data": "07/08/2025 18:28:10" },
    { "id": "d6857824-507d-40b1-a33f-7bb26d9e8185", "attendantId": "8773973a-9a4e-436e-bd93-37150645852b", "nota": 5, "comentario": "(Sem comentário)", "data": "07/08/2025 18:34:09" },
    { "id": "a78614e3-e4bb-4659-b94e-c8f725b3adf0", "attendantId": "8773973a-9a4e-436e-bd93-37150645852b", "nota": 5, "comentario": "Muito bom Atendimento", "data": "07/08/2025 19:00:00" },
    { "id": "4b470592-5f8b-4eb3-917b-85d19a5cd378", "attendantId": "8773973a-9a4e-436e-bd93-37150645852b", "nota": 5, "comentario": "(Sem comentário)", "data": "07/08/2025 19:17:46" },
    { "id": "2658e835-56e8-4b23-a704-d67231c64327", "attendantId": "8773973a-9a4e-436e-bd93-37150645852b", "nota": 5, "comentario": "(Sem comentário)", "data": "08/08/2025 12:26:02" },
    { "id": "414bce17-55c4-4da7-8052-562593e9b72a", "attendantId": "8773973a-9a4e-436e-bd93-37150645852b", "nota": 5, "comentario": "Ótimo atendimento!", "data": "08/08/2025 12:29:56" },
    { "id": "e69d02a3-4c79-4a85-8525-fd1212248ac7", "attendantId": "70b5223e-7fb4-43c6-ac88-3513482a9139", "nota": 5, "comentario": "Moça muito atenciosa.", "data": "08/08/2025 16:25:49" },
    { "id": "8ca9d8de-d1f4-40ff-9555-c77eb4cf81c0", "attendantId": "64a10ce1-5d8b-4675-94f7-965e7ed14afa", "nota": 5, "comentario": "(Sem comentário)", "data": "08/08/2025 18:42:48" },
    { "id": "572fc557-750d-4c90-9aa0-b4fc1bfeb998", "attendantId": "64a10ce1-5d8b-4675-94f7-965e7ed14afa", "nota": 5, "comentario": "Lucas é um profissão exemplar. Dedicado ao serviço e muito focado no atendimento do cliente. Tivemos uma demanda onde necessitamos o apoio dele e o resulto foi além do esperado. Sempre muito paciente e disponível para atender ao cliente. Parabéns.", "data": "08/08/2025 19:15:11" },
    { "id": "e8142186-bb2f-4348-b328-235ba7ea7e22", "attendantId": "00c33394-ced5-4786-a785-e6509b2fa631", "nota": 5, "comentario": "(Sem comentário)", "data": "08/08/2025 21:25:11" },
    { "id": "1b1db94c-d748-4d3c-a0f6-d92689451131", "attendantId": "00c33394-ced5-4786-a785-e6509b2fa631", "nota": 5, "comentario": "(Sem comentário)", "data": "08/08/2025 21:36:17" }
];

export const INITIAL_EVALUATIONS: Omit<Evaluation, 'importId'>[] = INITIAL_EVALUATIONS_RAW.map(ev => ({
    ...ev,
    data: parseEvaluationDate(ev.data),
    xpGained: getScoreFromRating(ev.nota, INITIAL_RATING_SCORES), // Initial calculation
}));
