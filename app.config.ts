import { ApplicationConfig, importProvidersFrom, enableProdMode } from '@angular/core';
import { provideRouter, withViewTransitions, withInMemoryScrolling, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, HttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { BrowserModule, Title } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { routes } from './src/app/app.route';

// store
import { provideStore } from '@ngrx/store';
import { indexReducer } from './src/app/store/index.reducer';

// i18n
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

// base url
export function getBaseUrl() {
    return document.getElementsByTagName('base')[0].href;
}

// service
import { AppService } from './src/app/service/app.service';

// interceptors
import { JwtInterceptor } from './src/jwt.interceptor';
import { ErrorInterceptor } from './src/error.interceptor';

// environment
import { environment } from './src/environments/environment';
if (environment.production) {
    enableProdMode();
}

// perfect-scrollbar
import { provideScrollbarOptions } from 'ngx-scrollbar';

export const appConfig: ApplicationConfig = {
    providers: [
        Title,
        AppService,
        importProvidersFrom(BrowserModule, CommonModule, FormsModule),
        provideRouter(
            routes,
            withViewTransitions(),
            withComponentInputBinding(),
            withInMemoryScrolling({
                scrollPositionRestoration: 'enabled',
            }),
        ),
        provideHttpClient(withInterceptorsFromDi()),
        provideTranslateService({
            loader: provideTranslateHttpLoader({
                prefix: './assets/i18n/',
                suffix: '.json',
                useHttpBackend: true,
            }),
            fallbackLang: 'en',
        }),
        { provide: 'BASE_URL', useFactory: getBaseUrl, deps: [] },
        { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true },
        { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
        provideScrollbarOptions({
            visibility: 'hover',
            appearance: 'compact',
        }),
        provideAnimations(),
        provideStore({ index: indexReducer }),
    ],
};
