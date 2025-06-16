// src/types/next-auth.d.ts
import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
    interface Session {
        user: {
            id?: string;
            role?: string;
            villages?: string[]; // Satele primarului
            village?: string; // Satul principal al fermierului
        } & DefaultSession["user"];
    }

    interface User extends DefaultUser {
        role?: string;
        villages?: string[];
        village?: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id?: string;
        role?: string;
        villages?: string[];
        village?: string;
    }
}