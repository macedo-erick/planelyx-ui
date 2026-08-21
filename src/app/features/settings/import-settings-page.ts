import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ToggleSwitch } from 'primeng/toggleswitch';

import { injectTranslate } from '../../core/i18n/translate';
import { FeatureFlag, FeatureFlagKey } from '../../shared/models/ingest';
import { PlanelyxCard } from '../../shared/ui/card';
import { PlanelyxEmptyState } from '../../shared/ui/empty-state';
import { PlanelyxPageHeader } from '../../shared/ui/page-header';
import { dateTime } from '../../shared/util/date-format';
import { FeatureFlagService } from '../ingest/feature-flag.service';

/** Transloco cannot address a key containing dots, so each flag gets a slug of its own. */
const LABEL_SLUG: Readonly<Record<FeatureFlagKey, string>> = {
  'parse.pdf_statement': 'pdfStatement',
  'parse.csv': 'csv',
  'parse.ofx': 'ofx',
  'parse.receipt_image': 'receiptImage',
  'llm.escalation': 'llmEscalation',
};

const PARSE_PREFIX = 'parse.';

/** The switches that decide what `planelyx-ocr` will read, flipped without a redeploy. */
@Component({
  selector: 'planelyx-import-settings-page',
  imports: [FormsModule, ToggleSwitch, PlanelyxCard, PlanelyxEmptyState, PlanelyxPageHeader],
  templateUrl: './import-settings-page.html',
  styles: `
    :host {
      display: block;
    }
  `,
})
export class ImportSettingsPage {
  protected readonly flags = inject(FeatureFlagService);
  private readonly messages = inject(MessageService);
  protected readonly t = injectTranslate();

  private readonly saving = signal<ReadonlySet<FeatureFlagKey>>(new Set());

  /** Two groups: what the server will accept at all, and how hard it tries to read it. */
  protected readonly sections = computed(() => [
    {
      id: 'formats',
      title: this.t('importSettings.formats'),
      message: this.t('importSettings.formatsMessage'),
      flags: this.flags.ordered().filter((flag) => flag.key.startsWith(PARSE_PREFIX)),
    },
    {
      id: 'reading',
      title: this.t('importSettings.reading'),
      message: this.t('importSettings.readingMessage'),
      flags: this.flags.ordered().filter((flag) => !flag.key.startsWith(PARSE_PREFIX)),
    },
  ]);

  protected when(flag: FeatureFlag): string {
    return dateTime(flag.updatedAt);
  }

  protected inputId(flag: FeatureFlag): string {
    return `flag-${flag.key.replace(/\./g, '-')}`;
  }

  protected label(flag: FeatureFlag): string {
    return this.t(`importSettings.flag.${LABEL_SLUG[flag.key]}.label`);
  }

  protected description(flag: FeatureFlag): string {
    return this.t(`importSettings.flag.${LABEL_SLUG[flag.key]}.description`);
  }

  protected isSaving(flag: FeatureFlag): boolean {
    return this.saving().has(flag.key);
  }

  /** On for the user, off in practice: the switch cannot supply an API key the process lacks. */
  protected isInert(flag: FeatureFlag): boolean {
    return flag.enabled && !flag.effective;
  }

  protected onToggle(flag: FeatureFlag, enabled: boolean): void {
    if (this.isSaving(flag)) {
      return;
    }

    this.saving.update((keys) => new Set(keys).add(flag.key));

    this.flags.setEnabled(flag.key, enabled).subscribe({
      next: (updated) => {
        this.settled(flag.key);

        this.messages.add({
          severity: 'success',
          summary: this.t(
            updated.enabled ? 'importSettings.turnedOn' : 'importSettings.turnedOff',
            {
              name: this.label(updated),
            },
          ),
          detail: this.t('importSettings.propagates'),
          life: 6000,
        });
      },
      error: () => {
        this.settled(flag.key);
        this.flags.reload();
      },
    });
  }

  private settled(key: FeatureFlagKey): void {
    this.saving.update((keys) => {
      const next = new Set(keys);
      next.delete(key);

      return next;
    });
  }
}
