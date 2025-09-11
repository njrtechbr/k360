import { NextRequest, NextResponse } from "next/server";

/**
 * API DEPRECIADA - Redirecionamento para /api/funcoes
 *
 * Esta API foi movida para /api/funcoes para seguir padrões REST consistentes.
 * Mantenha este redirecionamento para compatibilidade com código existente.
 */

export async function GET(request: NextRequest) {
  // Redirecionar para a nova API
  const url = new URL("/api/funcoes", request.url);

  // Preservar query parameters
  const searchParams = new URL(request.url).searchParams;
  searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  return NextResponse.redirect(url, 301);
}

export async function POST(request: NextRequest) {
  // Redirecionar para a nova API
  const url = new URL("/api/funcoes", request.url);
  return NextResponse.redirect(url, 301);
}
