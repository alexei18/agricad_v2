// src/app/api/auth/[...nextauth]/route.ts
import NextAuth, { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';

// Tip extins pentru utilizatorul din sesiune și token JWT
// Acesta ar trebui să fie într-un fișier next-auth.d.ts, dar îl includem aici pentru context
interface ExtendedUser {
    id: string;
    name?: string | null;
    email?: string | null;
    role?: string;
    villages?: string[]; // Array de nume de sate pentru primar
    village?: string;   // Satul principal pentru fermier
    // mustChangePassword?: boolean; // Dacă este necesar
}


export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: "Email", type: "email", placeholder: "exemplu@domeniu.com" },
                password: { label: "Parolă", type: "password" }
            },
            async authorize(credentials): Promise<ExtendedUser | null> {
                if (!credentials?.email || !credentials?.password) {
                    console.error('[AUTH] Lipsesc email sau parola.');
                    return null;
                }

                const inputEmail = credentials.email;
                const inputPassword = credentials.password;
                console.log(`[AUTH] Încercare autorizare pentru: ${inputEmail}`);

                // Admin login (din .env)
                const adminEmail = process.env.ADMIN_EMAIL;
                const adminPassword = process.env.ADMIN_PASSWORD;
                if (inputEmail === adminEmail) {
                    if (inputPassword === adminPassword) {
                        console.log('[AUTH] Autorizare Admin reușită (din .env).');
                        return { id: 'admin_user', email: adminEmail, name: 'Administrator', role: 'admin' };
                    } else {
                        console.log('[AUTH] Parolă Admin incorectă (din .env).');
                        return null;
                    }
                }

                // Mayor sau Farmer login (din DB)
                console.log(`[AUTH] Verificare în baza de date pentru: ${inputEmail}`);
                try {
                    let userFromDb: any = await prisma.mayor.findUnique({
                        where: { email: inputEmail },
                        include: { managedVillages: { select: { name: true } } } // Include satele gestionate
                    });
                    let role = 'mayor';
                    let userVillages: string[] | undefined = undefined;
                    let userVillage: string | undefined = undefined;

                    if (userFromDb) {
                        userVillages = userFromDb.managedVillages.map((v: { name: string }) => v.name);
                    } else {
                        userFromDb = await prisma.farmer.findUnique({
                            where: { email: inputEmail },
                        });
                        role = 'farmer';
                        if (userFromDb) {
                            userVillage = userFromDb.village;
                        }
                    }

                    if (!userFromDb) {
                        console.log(`[AUTH] Utilizator (Primar/Agricultor) negăsit în DB: ${inputEmail}`);
                        return null;
                    }

                    const passwordMatch = await bcrypt.compare(inputPassword, userFromDb.password);
                    if (!passwordMatch) {
                        console.log(`[AUTH] Parolă DB incorectă pentru: ${inputEmail}`);
                        return null;
                    }

                    console.log(`[AUTH] Autorizare DB cu succes pentru: ${inputEmail}, Rol: ${role}`);

                    const authorizedUser: ExtendedUser = {
                        id: userFromDb.id,
                        email: userFromDb.email,
                        name: userFromDb.name,
                        role: role,
                    };

                    if (role === 'mayor') {
                        authorizedUser.villages = userVillages || [];
                    } else if (role === 'farmer') {
                        authorizedUser.village = userVillage;
                    }
                    // Adăugați mustChangePassword dacă este în modelul userFromDb
                    // if (userFromDb.mustChangePassword) {
                    //    authorizedUser.mustChangePassword = userFromDb.mustChangePassword;
                    // }

                    return authorizedUser;

                } catch (error) {
                    console.error('[AUTH] Eroare în funcția authorize (DB check):', error);
                    return null;
                }
            }
        })
    ],
    session: {
        strategy: 'jwt',
    },
    callbacks: {
        async jwt({ token, user }) {
            // `user` este disponibil doar la prima conectare sau la actualizarea sesiunii
            if (user) {
                const extendedUser = user as ExtendedUser;
                token.id = extendedUser.id;
                token.role = extendedUser.role;
                if (extendedUser.role === 'mayor') {
                    token.villages = extendedUser.villages || [];
                } else if (extendedUser.role === 'farmer') {
                    token.village = extendedUser.village;
                }
                // token.mustChangePassword = extendedUser.mustChangePassword; // Dacă e necesar
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                const sessionUser = session.user as ExtendedUser;
                sessionUser.id = token.id as string;
                sessionUser.role = token.role as string;
                if (token.role === 'mayor') {
                    sessionUser.villages = token.villages as string[] || [];
                } else if (token.role === 'farmer') {
                    sessionUser.village = token.village as string | undefined;
                }
                // sessionUser.mustChangePassword = token.mustChangePassword as boolean | undefined; // Dacă e necesar
            }
            return session;
        },
    },
    pages: {
        signIn: '/',
    },
    secret: process.env.NEXTAUTH_SECRET,
    debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };