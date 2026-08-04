import { NgTemplateOutlet } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Drawer } from 'primeng/drawer';
import { Toast } from 'primeng/toast';

import { AuthService } from '../core/auth/auth.service';
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
    Drawer,
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
  protected readonly navItems = NAV_ITEMS;
  /** Where the brand takes you — the same landing page the empty route redirects to. */
  protected readonly homeRoute = '/dashboard';
  protected mobileNavOpen = signal(false);
}
