import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Definir quais rotas são públicas (não requerem autenticação)
  const publicPaths = ["/login", "/api/auth"];
  const isPublicPath = publicPaths.some(publicPath => 
    path === publicPath || path.startsWith(`${publicPath}/`)
  );

  // Verificar se o usuário está autenticado
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  });
  
  // Se o caminho for público e o usuário estiver autenticado, redirecionar para o dashboard
  if (isPublicPath && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  
  // Se o caminho não for público e o usuário não estiver autenticado, redirecionar para o login
  if (!isPublicPath && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  
  return NextResponse.next();
}

// Configurar quais rotas o middleware deve ser executado
export const config = {
  matcher: ["/", "/login", "/dashboard/:path*", "/admin/:path*"]
};