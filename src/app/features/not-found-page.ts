import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';

@Component({
  selector: 'fintrack-not-found-page',
  imports: [RouterLink, Button],
  template: `
    <div class="grid h-full place-items-center p-8 text-center">
      <div class="flex flex-col items-center gap-3">
        <i class="pi pi-compass text-4xl text-[var(--p-text-muted-color)]" aria-hidden="true"></i>
        <h1 class="text-2xl font-semibold">Page not found</h1>
        <p class="text-[var(--p-text-muted-color)]">That page does not exist.</p>
        <p-button routerLink="/dashboard" label="Back to dashboard" />
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
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class NotFoundPage {}
