import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Only signed-in users. */
export const authGuard: CanActivateFn = (_route, state) => {
    const auth = inject(AuthService);
    if (auth.isLoggedIn()) return true;
    return inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** Only admins. Cashiers are sent to the POS screen. */
export const adminGuard: CanActivateFn = () => {
    const auth = inject(AuthService);
    if (auth.isAdmin()) return true;
    return inject(Router).createUrlTree([auth.isLoggedIn() ? '/pos' : '/login']);
};

/** Only signed-out users (login page). */
export const guestGuard: CanActivateFn = () => {
    const auth = inject(AuthService);
    if (!auth.isLoggedIn()) return true;
    return inject(Router).createUrlTree([auth.isAdmin() ? '/dashboard' : '/pos']);
};
