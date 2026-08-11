import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { email, form, FormField, maxLength, required } from '@angular/forms/signals';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';

import { AuthService } from '../../core/auth/auth.service';
import { injectTranslate } from '../../core/i18n/translate';
import { PlanelyxTextInput } from '../../shared/controls/text-input';
import { PlanelyxCard } from '../../shared/ui/card';
import { PlanelyxPageHeader } from '../../shared/ui/page-header';
import { ProfileService } from './profile.service';

interface ProfileFormModel {
  firstName: string;
  lastName: string;
  email: string;
}

const empty = (): ProfileFormModel => ({ firstName: '', lastName: '', email: '' });

/** The signed-in user's profile, which is held by Keycloak rather than by Planelyx. */
@Component({
  selector: 'planelyx-profile-page',
  imports: [Button, FormField, FormsModule, PlanelyxTextInput, PlanelyxCard, PlanelyxPageHeader],
  templateUrl: './profile-page.html',
})
export class ProfilePage {
  protected readonly service = inject(ProfileService);
  protected readonly auth = inject(AuthService);
  private readonly messages = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly t = injectTranslate();
  protected readonly saving = signal(false);

  protected readonly model = signal<ProfileFormModel>(empty());

  protected readonly f = form(this.model, (path) => {
    required(path.firstName, { message: this.t('validation.firstName') });
    maxLength(path.firstName, 255);
    maxLength(path.lastName, 255);
    required(path.email, { message: this.t('validation.emailRequired') });
    email(path.email, { message: this.t('validation.email') });
  });

  constructor() {
    effect(() => {
      const profile = this.service.profile();
      if (profile) {
        this.f().reset({
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email,
        });
      }
    });
  }

  protected openPasswordChange(): void {
    this.auth.openAccountManagement();
  }

  /** Claims are refreshed after a successful save. */
  protected onSubmit(): void {
    this.f().markAsTouched();
    if (this.f().invalid()) {
      this.f().errorSummary()[0]?.fieldTree?.().focusBoundControl();
      return;
    }

    const value = this.model();

    this.saving.set(true);
    this.service
      .update({
        firstName: value.firstName.trim(),
        lastName: value.lastName.trim(),
        email: value.email.trim(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.messages.add({
            severity: 'success',
            summary: this.t('profile.updated'),
            life: 3000,
          });
          void this.auth.refreshClaims();
        },
        error: () => this.saving.set(false),
      });
  }
}
