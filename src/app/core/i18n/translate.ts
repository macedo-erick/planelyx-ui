import { inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';

/** Interpolation values for a key such as `"Delete {{name}}?"`. */
export type TranslateParams = Record<string, string | number>;

export type TranslateFn = (key: string, params?: TranslateParams) => string;

/**
 * A `t()` for components — usable from a template and from ordinary TypeScript alike.
 *
 * The alternative, wrapping every template in `*transloco="let t"`, does not reach the strings
 * built in TypeScript: confirm dialogs and toasts interpolate formatted money and entity names,
 * and those live in the component. One helper covers both.
 *
 * It reads the active language as a signal before translating, so calling it from a template
 * registers a dependency and every label re-renders on a language change — the same mechanism
 * that makes `formatMoney` follow the switch.
 *
 * Must be called from an injection context, i.e. a field initializer:
 * `protected readonly t = injectTranslate();`
 *
 * The returned function reads `activeLang` for the dependency, not for the value — `translate`
 * resolves the active language itself, but nothing would re-run on a switch without that read.
 */
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
