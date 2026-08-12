import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { currentLocale } from './app/shared/util/locale';

document.documentElement.lang = currentLocale();

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
