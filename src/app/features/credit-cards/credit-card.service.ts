import { Service, computed } from '@angular/core';

import { CrudService } from '../../core/http/crud-service';
import { Uuid } from '../../shared/models/common';
import { CreditCard, CreditCardRequest } from '../../shared/models/credit-card';
import { SelectOption } from '../../shared/util/enum-labels';
import { qualifiedLabel } from '../../shared/util/option-label';

@Service()
export class CreditCardService extends CrudService<CreditCard, CreditCardRequest> {
  constructor() {
    super('credit-cards');
  }

  readonly sorted = computed(() => [...this.items()].sort((a, b) => a.name.localeCompare(b.name)));

  readonly options = computed<SelectOption<Uuid>[]>(() =>
    this.sorted().map((card) => ({
      label: qualifiedLabel(card.name, card.brand),
      value: card.id,
    })),
  );

  readonly byIdMap = computed(() => new Map(this.items().map((c) => [c.id, c])));
}
