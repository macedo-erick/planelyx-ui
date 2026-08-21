import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Button } from 'primeng/button';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Drawer } from 'primeng/drawer';
import { Popover } from 'primeng/popover';
import { Toast } from 'primeng/toast';

import { AmountVisibilityService } from '../core/amount-visibility.service';
import { AuthService } from '../core/auth/auth.service';
import { OCR_ADMIN_ROLE } from '../core/auth/role.guard';
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
  protected readonly amounts = inject(AmountVisibilityService);
  protected readonly t = injectTranslate();
  protected readonly navItems = NAV_ITEMS;
  protected readonly homeRoute = '/dashboard';
  protected mobileNavOpen = signal(false);

  /** Cosmetic only: `planelyx-ocr` refuses the write again whatever the browser shows. */
  protected readonly isOcrAdmin = computed(() => this.auth.hasRole(OCR_ADMIN_ROLE));
}
