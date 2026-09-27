import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { MovaLogoComponent } from '../shared/ui/mova-logo';
import { IconMailComponent } from '../shared/icon/icon-mail';
import { IconLockDotsComponent } from '../shared/icon/icon-lock-dots';
import { IconEyeComponent } from '../shared/icon/icon-eye';

@Component({
    imports: [ReactiveFormsModule, RouterLink, MovaLogoComponent, IconMailComponent, IconLockDotsComponent, IconEyeComponent],
    template: `
        <div class="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#fafafa] px-4 py-10 dark:bg-[#060818]">
            <div class="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-mova-cyan/20 blur-3xl"></div>
            <div class="pointer-events-none absolute -bottom-32 -right-24 h-[28rem] w-[28rem] rounded-full bg-primary/20 blur-3xl"></div>
            <div class="pointer-events-none absolute right-1/4 top-10 h-40 w-40 rounded-full bg-secondary/20 blur-3xl"></div>

            <div class="relative w-full max-w-[460px]">
                <div class="mb-8 flex justify-center">
                    <app-mova-logo />
                </div>

                <div class="panel !rounded-2xl px-6 py-8 sm:px-10">
                    @if (buying()) {
                        <h1 class="text-2xl font-extrabold text-black dark:text-white">Sign in to buy</h1>
                        <p class="mt-1 text-white-dark">Sign in and the item will be waiting in your cart.</p>
                    } @else {
                        <h1 class="text-2xl font-extrabold text-black dark:text-white">Sign in to your shop</h1>
                        <p class="mt-1 text-white-dark">Manage sales, stock and customers in one place.</p>
                    }

                    <form class="mt-7 space-y-5" [formGroup]="form" (ngSubmit)="submit()">
                        <div [class.has-error]="submitted() && form.controls.email.invalid">
                            <label for="email">Email</label>
                            <div class="relative text-white-dark">
                                <input
                                    id="email"
                                    type="email"
                                    autocomplete="username"
                                    formControlName="email"
                                    class="form-input ps-10"
                                    placeholder="you@shop.com"
                                />
                                <span class="absolute start-4 top-1/2 -translate-y-1/2"><icon-mail [fill]="true" /></span>
                            </div>
                            @if (submitted() && form.controls.email.invalid) {
                                <p class="mt-1 text-danger">Enter a valid email address.</p>
                            }
                        </div>
                        <div [class.has-error]="submitted() && form.controls.password.invalid">
                            <label for="password">Password</label>
                            <div class="relative text-white-dark">
                                <input
                                    id="password"
                                    [type]="showPassword() ? 'text' : 'password'"
                                    autocomplete="current-password"
                                    formControlName="password"
                                    class="form-input pe-10 ps-10"
                                    placeholder="Your password"
                                />
                                <span class="absolute start-4 top-1/2 -translate-y-1/2"><icon-lock-dots [fill]="true" /></span>
                                <button
                                    type="button"
                                    class="absolute end-3 top-1/2 -translate-y-1/2 hover:text-primary"
                                    [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
                                    (click)="showPassword.set(!showPassword())"
                                >
                                    <icon-eye />
                                </button>
                            </div>
                            @if (submitted() && form.controls.password.invalid) {
                                <p class="mt-1 text-danger">Enter your password.</p>
                            }
                        </div>

                        @if (error()) {
                            <div class="rounded bg-danger-light p-3 text-danger dark:bg-danger-dark-light" role="alert">{{ error() }}</div>
                        }

                        <button type="submit" class="btn btn-gradient !mt-7 w-full border-0 uppercase shadow-[0_10px_20px_-10px_rgba(114,9,183,0.6)]">
                            Sign in
                        </button>
                    </form>

                    <div class="relative my-7 text-center">
                        <span class="absolute inset-x-0 top-1/2 h-px w-full -translate-y-1/2 bg-white-light dark:bg-white-dark/20"></span>
                        <span class="relative bg-white px-2 text-xs font-bold uppercase text-white-dark dark:bg-[#0e1726]">Demo accounts</span>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            class="btn btn-outline-primary flex-col !items-start gap-0.5 text-left"
                            (click)="fill('admin@mova.shop', 'admin123')"
                        >
                            <span class="font-bold">Admin</span>
                            <span class="text-xs font-normal opacity-80">Full access</span>
                        </button>
                        <button
                            type="button"
                            class="btn btn-outline-info flex-col !items-start gap-0.5 text-left"
                            (click)="fill('cashier@mova.shop', 'cashier123')"
                        >
                            <span class="font-bold">Cashier</span>
                            <span class="text-xs font-normal opacity-80">POS, orders, customers</span>
                        </button>
                    </div>
                </div>
                <p class="mt-6 text-center">
                    <a routerLink="/" class="font-semibold text-primary hover:underline dark:text-[#b983e6]">← Back to shop</a>
                </p>
                <p class="mt-3 text-center text-xs text-white-dark">Demo mode: data is stored in this browser only.</p>
            </div>
        </div>
    `,
})
export class LoginPage {
    private fb = inject(FormBuilder);
    private auth = inject(AuthService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);

    readonly submitted = signal(false);
    readonly error = signal('');
    readonly showPassword = signal(false);
    /** Came here from a storefront "Buy" button. */
    readonly buying = signal(!!this.route.snapshot.queryParamMap.get('returnUrl')?.includes('add='));

    readonly form = this.fb.nonNullable.group({
        email: ['', [Validators.required, Validators.email]],
        password: ['', Validators.required],
    });

    fill(email: string, password: string) {
        this.form.setValue({ email, password });
        this.submit();
    }

    submit() {
        this.submitted.set(true);
        this.error.set('');
        if (this.form.invalid) return;
        const { email, password } = this.form.getRawValue();
        const result = this.auth.login(email, password);
        if (!result.ok) {
            this.error.set(result.message);
            return;
        }
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        const fallback = this.auth.isAdmin() ? '/dashboard' : '/pos';
        this.router.navigateByUrl(returnUrl && returnUrl !== '/login' ? returnUrl : fallback);
    }
}
