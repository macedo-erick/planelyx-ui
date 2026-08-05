import { inject, Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';

/** Appended to every page title, and not translated — it is the product's name. */
const SUFFIX = 'Planelyx';

/**
 * Resolves a route's `title` as a translation key rather than as literal text.
 *
 * Also re-runs on a language change: the browser tab keeps whatever was set last, so without
 * this the title would stay in the previous language until the next navigation.
 */
@Injectable({ providedIn: 'root' })
export class TranslatedTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly transloco = inject(TranslocoService);

  private latest: RouterStateSnapshot | null = null;

  constructor() {
    super();
    this.transloco.langChanges$.subscribe(() => {
      if (this.latest) {
        this.updateTitle(this.latest);
      }
    });
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.latest = snapshot;

    const key = this.buildTitle(snapshot);
    if (!key) {
      this.title.setTitle(SUFFIX);
      return;
    }

    this.title.setTitle(`${this.transloco.translate(key)} · ${SUFFIX}`);
  }
}
