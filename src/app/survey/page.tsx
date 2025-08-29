
"use client";

import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, ThumbsUp, UserCircle } from 'lucide-react';
import Link from 'next/link';

const RatingSelector = ({ rating, setRating }: { rating: number; setRating: (r: number) => void }) => {
    return (
        <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} type="button" onClick={() => setRating(star)}>
                    <Star
                        className={`h-10 w-10 transition-colors ${
                            star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 hover:text-yellow-300'
                        }`}
                    />
                </button>
            ))}
        </div>
    );
};

export default function SurveyPage() {
    const searchParams = useSearchParams();
    const { attendants, addEvaluation, loading } = useAuth();
    
    const attendantId = searchParams.get('attendantId');
    const attendant = useMemo(() => attendants.find(a => a.id === attendantId), [attendants, attendantId]);

    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0) {
            setError("Por favor, selecione uma nota de 1 a 5 estrelas.");
            return;
        }
        setError(null);
        setIsSubmitting(true);
        try {
            await addEvaluation({
                attendantId: attendant!.id,
                nota: rating,
                comentario: comment || '(Sem comentário)',
            });
            setIsSubmitted(true);
        } catch (err) {
            setError("Ocorreu um erro ao enviar sua avaliação. Tente novamente.");
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (loading) {
        return <div className="flex items-center justify-center min-h-screen bg-muted/40"><p>Carregando...</p></div>;
    }

    if (!attendantId || !attendant) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-muted/40 px-4">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <CardTitle className="text-destructive">Atendente não encontrado</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>O link de avaliação é inválido ou o atendente não foi encontrado no sistema.</p>
                         <Button asChild className="mt-4">
                            <Link href="/">Voltar ao Início</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    if (isSubmitted) {
        return (
             <div className="flex items-center justify-center min-h-screen bg-muted/40 px-4">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <div className="mx-auto bg-green-100 dark:bg-green-900 rounded-full h-20 w-20 flex items-center justify-center">
                           <ThumbsUp className="h-12 w-12 text-green-600 dark:text-green-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <CardTitle className="text-2xl font-bold mb-2">Obrigado por sua avaliação!</CardTitle>
                        <CardDescription>Seu feedback é muito importante para nós e nos ajuda a melhorar nossos serviços.</CardDescription>
                         <Button asChild className="mt-6">
                            <Link href="/">Voltar ao Início</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-muted/40 px-4 py-12">
            <Card className="w-full max-w-lg">
                <CardHeader className="text-center">
                    <Avatar className="h-24 w-24 mx-auto mb-4">
                        <AvatarImage src={attendant.avatarUrl} alt={attendant.name} />
                        <AvatarFallback><UserCircle className="h-12 w-12" /></AvatarFallback>
                    </Avatar>
                    <CardTitle className="text-2xl">Pesquisa de Satisfação</CardTitle>
                    <CardDescription>Avalie o atendimento de <span className="font-bold">{attendant.name}</span></CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="space-y-2">
                           <p className="text-center font-medium">Qual a sua nota para o atendimento recebido?</p>
                            <RatingSelector rating={rating} setRating={setRating} />
                        </div>

                        <div className="space-y-2">
                           <label htmlFor="comment" className="font-medium">Deixe um comentário (opcional):</label>
                            <Textarea
                                id="comment"
                                placeholder="Seu feedback nos ajuda a melhorar..."
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                rows={4}
                            />
                        </div>

                        {error && <p className="text-sm text-center font-medium text-destructive">{error}</p>}

                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? 'Enviando...' : 'Enviar Avaliação'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
