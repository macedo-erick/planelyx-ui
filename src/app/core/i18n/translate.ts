import { inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';

/** Interpolation values for a key such as `"Delete {{name}}?"`. */
export type TranslateParams = Record<string, string | number>;

export type TranslateFn = (key: string, params?: TranslateParams) => string;

/** A `t()` for components — usable from a template and from ordinary TypeScript alike. */
export function injectTranslate(): TranslateFn {
  const transloco = inject(TranslocoService);
  const activeLang = toSignal(transloco.langChanges$, {
    initialValue: transloco.getActiveLang(),
  });

  return (key, params) => {
    activeLang();
    return transloco.translate(key, params);
  };
}
