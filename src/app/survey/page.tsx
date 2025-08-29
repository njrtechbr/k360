
"use client";

import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, Star, ThumbsUp, UserCircle } from 'lucide-react';
import Link from 'next/link';

const RatingSelector = ({ rating, setRating }: { rating: number; setRating: (r: number) => void }) => {
    return (
        <div className="flex justify-center gap-2 sm:gap-4">
            {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} type="button" onClick={() => setRating(star)} aria-label={`Avaliar com ${star} estrela${star > 1 ? 's' : ''}`}>
                    <Star
                        className={`h-10 w-10 sm:h-12 sm:w-12 transform transition-all duration-200 ease-in-out hover:scale-125 ${
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

    useEffect(() => {
        if (attendant) {
            document.title = `Avaliar: ${attendant.name} - ${attendant.funcao}`;
        } else {
             document.title = attendantId ? 'Atendente não encontrado' : 'Pesquisa de Satisfação';
        }
        
        // Reset title on component unmount
        return () => {
            document.title = 'Controle de Acesso';
        };
    }, [attendant, attendantId]);


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
        return (
             <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-900 dark:to-slate-800">
                <p>Carregando...</p>
            </div>
        )
    }

    if (!attendantId || !attendant) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-900 dark:to-slate-800 px-4">
                <Card className="w-full max-w-md text-center p-8 shadow-2xl animate-in fade-in zoom-in-95">
                    <CardHeader>
                        <CardTitle className="text-2xl text-destructive">Atendente não encontrado</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
             <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-900 dark:to-slate-800 px-4">
                <Card className="w-full max-w-md text-center p-8 shadow-2xl animate-in fade-in zoom-in-95">
                    <CardHeader>
                        <div className="mx-auto bg-green-100 dark:bg-green-900 rounded-full h-24 w-24 flex items-center justify-center ring-8 ring-green-50 dark:ring-green-950 animate-in fade-in-0 zoom-in-50 delay-200 duration-500">
                           <ThumbsUp className="h-12 w-12 text-green-600 dark:text-green-400" />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-5 delay-300 duration-500">
                        <h2 className="text-2xl font-bold">Obrigado por sua avaliação!</h2>
                        <p className="text-muted-foreground">Seu feedback é muito importante para nós e nos ajuda a melhorar nossos serviços.</p>
                         <Button asChild className="mt-6 w-full">
                            <Link href="/">Finalizar</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-900 dark:to-slate-800 px-4 py-8">
            <Card className="w-full max-w-md shadow-2xl rounded-2xl animate-in fade-in zoom-in-95">
                <CardContent className="p-6 md:p-8 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="relative p-1 bg-white rounded-full shadow-lg">
                           <Avatar className="h-24 w-24 md:h-28 md:w-28 border-4 border-white">
                                <AvatarImage src={attendant.avatarUrl} alt={attendant.name} />
                                <AvatarFallback><UserCircle className="h-12 w-12" /></AvatarFallback>
                            </Avatar>
                             <div className="absolute inset-0 rounded-full ring-4 ring-primary/20 animate-pulse"></div>
                        </div>
                    </div>
                    
                    <h1 className="text-2xl font-bold">{attendant.name}</h1>
                    <p className="text-primary font-medium mb-2">{attendant.funcao}</p>
                    
                    <h2 className="text-lg font-semibold mt-6">Pesquisa de Satisfação</h2>
                    <p className="text-muted-foreground mb-4 text-sm">Como você avalia o atendimento recebido?</p>
                    

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-3">
                           <h3 className="font-semibold">Sua avaliação</h3>
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
                                <RatingSelector rating={rating} setRating={setRating} />
                            </div>
                        </div>

                        <div className="space-y-3 text-left">
                           <label htmlFor="comment" className="flex items-center gap-2 font-semibold">
                               <MessageCircle className="h-5 w-5"/>
                               Deixe um comentário (opcional):
                           </label>
                            <Textarea
                                id="comment"
                                placeholder="Conte-nos mais sobre sua experiência..."
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                rows={3}
                                className="text-base"
                            />
                        </div>

                        {error && <p className="text-sm text-center font-medium text-destructive">{error}</p>}

                        <Button type="submit" size="lg" className="w-full text-lg font-bold" disabled={isSubmitting}>
                            {isSubmitting ? 'Enviando...' : 'Enviar Avaliação'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
