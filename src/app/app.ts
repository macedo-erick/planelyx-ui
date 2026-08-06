import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'planelyx-root',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
  // The shell sizes itself with `height: 100%`, which only resolves against a chain of blocks
  // with a definite height. Left unstyled this host is an inline box, and the block-in-inline
  // split it forces was enough to push the page past the viewport.
  host: { class: 'block h-full' },
})
export class App {}
