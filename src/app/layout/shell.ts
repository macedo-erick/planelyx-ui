import { NgTemplateOutlet } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Button } from 'primeng/button';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Drawer } from 'primeng/drawer';
import { Popover } from 'primeng/popover';
import { Toast } from 'primeng/toast';

import { AuthService } from '../core/auth/auth.service';
import { LocaleService } from '../core/i18n/locale.service';
import { injectTranslate } from '../core/i18n/translate';
import { ThemeService } from '../core/theme.service';
import { PlanelyxLogo } from '../shared/ui/logo';
import { NAV_ITEMS } from './nav-items';

@Component({
  selector: 'planelyx-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    NgTemplateOutlet,
    Button,
    Drawer,
    Popover,
    Toast,
    ConfirmDialog,
    PlanelyxLogo,
  ],
  templateUrl: './shell.html',
  styles: `
    :host {
      display: block;
      height: 100%;
    }
  `,
})
export class Shell {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  protected readonly locale = inject(LocaleService);
  protected readonly t = injectTranslate();
  protected readonly navItems = NAV_ITEMS;
  /** Where the brand takes you — the same landing page the empty route redirects to. */
  protected readonly homeRoute = '/dashboard';
  protected mobileNavOpen = signal(false);
}
