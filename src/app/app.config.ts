import { ApplicationConfig, importProvidersFrom, LOCALE_ID, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { APP_BASE_HREF, registerLocaleData } from '@angular/common';
import localeAr from '@angular/common/locales/ar';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { environment } from './environment/environment.dev';
import { translationAppInitializer } from './core/initializers';


export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}
registerLocaleData(localeAr);
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes), provideClientHydration(withEventReplay()),
    provideAnimationsAsync(),
    importProvidersFrom([
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: HttpLoaderFactory,
          deps: [HttpClient],
        },
      }),
    ]),
    
    provideHttpClient(
      // TODO APPLYING ERROR INTERCEPTOR HERE..
      withInterceptors([])
    ),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: '.dark-mode',
        },
      }
    }),
    {
      provide: APP_BASE_HREF,
      useValue: environment.baseHref
    },
    {
      provide: LOCALE_ID,
      deps: [TranslateService],
      useFactory: (translate: TranslateService) => {
        const lang = translate.currentLang || 'en';
        return lang === 'ar' ? 'ar' : 'en';
      }
    },
    provideAppInitializer(translationAppInitializer()),

  ]
};
