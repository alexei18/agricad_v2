// src/middleware.ts
import { withAuth, type NextRequestWithAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req: NextRequestWithAuth) {
    const token = req.nextauth.token; // Token-ul conține acum mustChangePassword și villages
    const pathname = req.nextUrl.pathname;

    console.log(`\n[MW] Request Path: ${pathname}`);
    // console.log(`[MW] Token:`, JSON.stringify(token, null, 2)); // Poate fi prea verbos pentru producție

    const publicPaths = ['/auth/login', '/auth/error']; // Pagini de autentificare
    const changePasswordPath = '/auth/change-initial-password';

    // 1. Dacă utilizatorul este pe o pagină de schimbare a parolei, permite accesul
    if (pathname === changePasswordPath) {
      console.log(`[MW] Acces permis la pagina de schimbare parolă: ${pathname}`);
      return NextResponse.next();
    }

    // 2. Verificare `mustChangePassword` pentru Mayor și Farmer
    // Adminul (din .env) nu are acest câmp/flux, deci token.mustChangePassword va fi undefined sau false.
    if (token && (token.role === 'mayor' || token.role === 'farmer') && token.mustChangePassword === true) {
      console.log(`[MW] User ${token.email} (rol ${token.role}) trebuie să schimbe parola. Redirectez la ${changePasswordPath}`);
      return NextResponse.redirect(new URL(changePasswordPath, req.url));
    }

    // 3. Redirecționează utilizatorul logat de la pagina de login ('/') către dashboard-ul corespunzător
    if (token && pathname === '/') {
      let redirectUrl = '/'; // Fallback
      const userRole = token?.role as string | undefined;
      switch (userRole) {
        case 'admin': redirectUrl = '/admin/dashboard'; break;
        case 'mayor': redirectUrl = '/mayor/dashboard'; break;
        case 'farmer': redirectUrl = '/farmer/dashboard'; break;
        default: console.log(`[MW] Rol necunoscut sau lipsă în token la redirect de pe /: ${userRole}`);
      }
      if (redirectUrl !== '/') {
        console.log(`[MW] Utilizator logat. Redirectez de la / către ${redirectUrl}`);
        return NextResponse.redirect(new URL(redirectUrl, req.url));
      }
    }

    // 4. Protejarea rutelor bazată pe rol
    if (token) {
      const userRole = token?.role as string | undefined;
      if (pathname.startsWith('/admin') && userRole !== 'admin') {
        console.log(`[MW] Acces refuzat la /admin pentru rol ${userRole}. Redirectez la /`);
        return NextResponse.redirect(new URL('/', req.url)); // Sau o pagină de "acces refuzat"
      }
      if (pathname.startsWith('/mayor') && userRole !== 'mayor') {
        console.log(`[MW] Acces refuzat la /mayor pentru rol ${userRole}. Redirectez la /`);
        return NextResponse.redirect(new URL('/', req.url));
      }
      if (pathname.startsWith('/farmer') && userRole !== 'farmer') {
        console.log(`[MW] Acces refuzat la /farmer pentru rol ${userRole}. Redirectez la /`);
        return NextResponse.redirect(new URL('/', req.url));
      }
    } else {
      // Dacă nu există token și ruta NU este publică (pagina de login '/', sau alte pagini publice)
      // withAuth ar trebui să gestioneze redirectarea la signIn page ('/')
      // Adăugăm o verificare explicită pentru a evita buclele
      if (pathname !== '/' && !publicPaths.some(p => pathname.startsWith(p))) {
        console.log(`[MW] Nu există token și ruta nu este publică. Path: ${pathname}. (withAuth ar trebui să redirecteze la /)`);
        // Nu mai este nevoie de redirect explicit aici, `withAuth` o face.
      }
    }

    console.log(`[MW] Acces permis la: ${pathname} pentru rol ${token?.role}`);
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        // Dacă token există, utilizatorul este considerat "autorizat" pentru a intra în logica middleware-ului principal.
        // Middleware-ul principal decide apoi dacă utilizatorul are acces la *acea rută specifică*.
        const isAuth = !!token;
        // console.log(`[MW Authorized CB] Path: ${req.nextUrl.pathname}, Token: ${JSON.stringify(token, null, 2)}, IsAuth: ${isAuth}`);
        return isAuth;
      }
    },
    pages: {
      signIn: '/', // Pagina unde sunt redirectați utilizatorii neautentificați
    },
  }
);

export const config = {
  matcher: [
    /*
     * Potrivește toate căile de cerere cu excepția celor care încep cu:
     * - api (cu excepția /api/auth și /api/trpc) - acestea sunt gestionate de NextAuth.js
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Orice fișiere din /public (ex: /images/logo.png)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|images/).*)', // S-a scos /api/ din excludere generală
    '/', // Asigură-te că și rădăcina este acoperită
  ],
};