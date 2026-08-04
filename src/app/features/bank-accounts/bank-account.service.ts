import { Service, computed } from '@angular/core';

import { CrudService } from '../../core/http/crud-service';
import { BankAccount, BankAccountRequest } from '../../shared/models/bank-account';
import { Uuid } from '../../shared/models/common';
import { SelectOption } from '../../shared/util/enum-labels';

@Service()
export class BankAccountService extends CrudService<BankAccount, BankAccountRequest> {
  constructor() {
    super('bank-accounts');
  }

  readonly sorted = computed(() => [...this.items()].sort((a, b) => a.name.localeCompare(b.name)));

  readonly options = computed<SelectOption<Uuid>[]>(() =>
    this.sorted().map((account) => ({
      label: `${account.name} · ${account.bankName}`,
      value: account.id,
    })),
  );

  readonly byIdMap = computed(() => new Map(this.items().map((a) => [a.id, a])));
}
