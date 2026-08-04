import { Component, input } from '@angular/core';

/**
 * The Planelyx mark — the same rounded square and rising bars as `public/favicon.svg`, so the
 * browser tab and the in-app brand read as one icon rather than two unrelated ones.
 *
 * Kept as markup instead of an `<img src="favicon.svg">` so it inherits the surrounding text
 * size and never flashes in unstyled while the file loads.
 */
@Component({
  selector: 'planelyx-logo',
  template: `
    <svg viewBox="0 0 1024 1024" role="img" aria-label="Planelyx" [style.width]="size()">
      <defs>
        <linearGradient [attr.id]="gradientId" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#34d399" />
          <stop offset="1" stop-color="#059669" />
        </linearGradient>
      </defs>
      <rect width="1024" height="1024" rx="230" [attr.fill]="'url(#' + gradientId + ')'" />
      <g fill="#fff">
        <rect x="248" y="560" width="148" height="232" rx="60" />
        <rect x="438" y="400" width="148" height="392" rx="60" />
        <rect x="628" y="240" width="148" height="552" rx="60" />
      </g>
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
    }

    svg {
      aspect-ratio: 1;
    }
  `,
})
export class PlanelyxLogo {
  /** Any CSS length; the mark is always square. */
  readonly size = input('1.5rem');

  /**
   * The gradient is referenced by `url(#…)`, which is document-scoped — two logos on the page
   * with the same id would be invalid markup, so each instance gets its own.
   */
  protected readonly gradientId = `planelyx-logo-${++instances}`;
}

let instances = 0;
