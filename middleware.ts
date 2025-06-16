// src/middleware.ts
import { withAuth, type NextRequestWithAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req: NextRequestWithAuth) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // ---- LOGGING MAI DETALIAT ----
    console.log(`\n[MW DEBUG] === Request Start ===`);
    console.log(`[MW DEBUG] Pathname: ${pathname}`);
    console.log(`[MW DEBUG] Token Object:`, JSON.stringify(token, null, 2));
    // ---------------------------

    // Permite accesul neautentificat la pagina /lading
    if (pathname === '/lading') {
      console.log(`[MW DEBUG] Public access to /lading. Token: ${!!token}`);
      // Optional: Dacă un utilizator AUTENTIFICAT încearcă să acceseze /lading,
      // îl putem redirecționa către dashboard-ul său. Sau îi permitem să vadă pagina.
      // Momentan, permitem accesul.
      return NextResponse.next();
    }

    // Redirecționează utilizatorul logat de la pagina de login ('/') către dashboard-ul corespunzător
    if (token && pathname === '/') {
      console.log(`[MW DEBUG] Utilizator autentificat pe pagina de login (/). Redirecționare...`);
      let redirectUrl = '/'; // Fallback, deși nu ar trebui atins dacă rolul e valid
      const userRole = token?.role as string | undefined;
      console.log(`[MW DEBUG] Rol utilizator pentru redirectare: ${userRole}`);
      switch (userRole) {
        case 'admin':
          redirectUrl = '/admin/dashboard';
          break;
        case 'mayor':
          redirectUrl = '/mayor/dashboard';
          break;
        case 'farmer':
          redirectUrl = '/farmer/dashboard';
          break;
        default:
          console.warn(`[MW DEBUG] Rol necunoscut sau lipsă în token pentru redirectare de la /: ${userRole}`);
          // Dacă rolul e invalid, poate ar trebui să-l delogăm sau să-l trimitem la o pagină de eroare.
          // Momentan, îl lăsăm pe pagina de login (/) dacă redirectUrl nu se schimbă.
          // Sau, mai sigur, redirectăm la o pagină generică de eroare sau suport.
          // Pentru moment, dacă rolul nu e bun, nu facem redirect.
          if (redirectUrl === '/') {
            console.log(`[MW DEBUG] Utilizator logat pe /, dar nu s-a găsit dashboard pentru rol: ${userRole}. Rămâne pe /.`);
            return NextResponse.next(); // Rămâne pe pagina de login
          }
      }
      console.log(`[MW DEBUG] Redirecționare către: ${redirectUrl}`);
      return NextResponse.redirect(new URL(redirectUrl, req.url));
    }

    // Verificare acces bazat pe rol pentru rutele protejate
    // Această logică rulează doar dacă `authorized` callback a returnat true (adică există token pentru aceste rute)
    if (token) {
      const userRole = token?.role as string | undefined;
      console.log(`[MW DEBUG] Verificare acces rol pentru: ${pathname}. Rol utilizator: ${userRole}`);
      if (pathname.startsWith('/admin') && userRole !== 'admin') {
        console.log(`[MW DEBUG] Acces refuzat la /admin (non-admin). Redirecționare la /`);
        return NextResponse.redirect(new URL('/', req.url)); // La pagina de login
      }
      if (pathname.startsWith('/mayor') && userRole !== 'mayor') {
        console.log(`[MW DEBUG] Acces refuzat la /mayor (non-mayor). Redirecționare la /`);
        return NextResponse.redirect(new URL('/', req.url));
      }
      if (pathname.startsWith('/farmer') && userRole !== 'farmer') {
        console.log(`[MW DEBUG] Acces refuzat la /farmer (non-farmer). Redirecționare la /`);
        return NextResponse.redirect(new URL('/', req.url));
      }
    }
    // Pentru rutele care nu sunt /lading și nu au token, `withAuth` se va ocupa de redirect la signIn pe baza rezultatului `authorized`.

    console.log(`[MW DEBUG] Acces permis la ${pathname} (fallthrough sau deja gestionat).`);
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const { pathname } = req.nextUrl;

        // Pagina /lading este mereu "autorizată" pentru a intra în funcția middleware principală,
        // unde se decide dacă se permite accesul sau se face redirect (ex: dacă e logat).
        if (pathname === '/lading') {
          console.log(`[MW DEBUG] Authorized Callback: Path este /lading, se autorizează pentru a continua la funcția middleware. Token: ${!!token}`);
          return true;
        }

        // Pentru toate celelalte rute din matcher, autorizarea depinde de existența token-ului.
        // Dacă token-ul lipsește, `withAuth` va redirecta automat la `pages.signIn` (adică '/').
        const isAuth = !!token;
        console.log(`[MW DEBUG] Authorized Callback Rezultat pentru ${pathname}: ${isAuth} (Token: ${token ? 'prezent' : 'absent'})`);
        return isAuth;
      }
    },
    pages: {
      signIn: '/', // Pagina de login rămâne la rădăcină
      // Alte pagini (error, signOut etc.) pot fi adăugate aici dacă e necesar
    },
  }
);

// Configurația matcher-ului
// Asigură-te că include toate rutele pe care vrei să le proceseze middleware-ul.
export const config = {
  matcher: [
    '/', // Pagina de login
    '/lading', // Pagina publică de prezentare
    // Rutele protejate (exemplu)
    '/admin/:path*',
    '/mayor/:path*',
    '/farmer/:path*',
    // Exclude rutele statice, API, imagini etc., dar include rutele principale.
    // Acest pattern general este OK, dar asigură-te că rutele specifice de mai sus sunt acoperite.
    // '/((?!api|_next/static|_next/image|favicon.ico).*)', // Pattern general, dar poate fi prea larg sau restrictiv.
    // Este mai sigur să specifici explicit grupurile de rute.
  ],
};