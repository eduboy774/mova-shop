import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DbService } from './db.service';
import { User } from './models';

const SESSION_KEY = 'mova_session';

/**
 * Demo authentication against the local user list.
 * This is NOT secure (passwords live in localStorage). Swap for a real auth API before production.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
    private db = inject(DbService);
    private router = inject(Router);

    private readonly userId = signal<string | null>(this.readSession());

    readonly user = computed<User | null>(() => {
        const id = this.userId();
        if (!id) return null;
        const user = this.db.users().find((u) => u.id === id);
        return user && user.active ? user : null;
    });
    readonly isLoggedIn = computed(() => !!this.user());
    readonly isAdmin = computed(() => this.user()?.role === 'admin');

    login(email: string, password: string): { ok: true } | { ok: false; message: string } {
        const user = this.db.users().find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
        if (!user || user.password !== password) {
            return { ok: false, message: 'Invalid email or password.' };
        }
        if (!user.active) {
            return { ok: false, message: 'This account is disabled. Contact the shop admin.' };
        }
        this.userId.set(user.id);
        try {
            localStorage.setItem(SESSION_KEY, user.id);
        } catch {
            // session will only last for this tab
        }
        return { ok: true };
    }

    logout() {
        this.userId.set(null);
        try {
            localStorage.removeItem(SESSION_KEY);
        } catch {
            // ignore
        }
        this.router.navigate(['/login']);
    }

    private readSession(): string | null {
        try {
            return localStorage.getItem(SESSION_KEY);
        } catch {
            return null;
        }
    }
}
