import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';

import { injectTranslate } from '../core/i18n/translate';

@Component({
  selector: 'planelyx-not-found-page',
  imports: [RouterLink, Button],
  template: `
    <div class="grid h-full place-items-center p-8 text-center">
      <div class="flex flex-col items-center gap-3">
        <i class="pi pi-compass text-4xl text-[var(--p-text-muted-color)]" aria-hidden="true"></i>
        <h1 class="text-2xl font-semibold">{{ t('notFound.title') }}</h1>
        <p class="text-[var(--p-text-muted-color)]">{{ t('notFound.message') }}</p>
        <p-button routerLink="/dashboard" [label]="t('notFound.back')" />
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }
  `,
})
export class NotFoundPage {
  protected readonly t = injectTranslate();
}
