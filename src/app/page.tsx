// src/app/page.tsx
'use client'; // Pagina de login va folosi state și interacțiuni client

import LoginForm from '@/components/auth/LoginForm';

export default function LoginPage() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
            <LoginForm />
        </div>
    );
}