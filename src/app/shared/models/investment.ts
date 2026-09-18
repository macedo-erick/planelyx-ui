import { IsoDate, IsoInstant, Money, Uuid } from './common';
import { InvestmentType } from './enums';

/** An investment as the API holds it. */
export interface Investment {
  readonly id: Uuid;
  readonly name: string;
  readonly institution: string;
  readonly investmentType: InvestmentType;
  readonly initialBalance: Money;
  readonly currency: string;
  readonly active: boolean;
  readonly createdAt: IsoInstant;
}

/** `contributed` is net of redemptions, so `balance - contributed` is the return. */
export interface InvestmentBalance {
  readonly investmentId: Uuid;
  readonly currency: string;
  readonly balance: Money;
  readonly contributed: Money;
  readonly asOf: IsoDate;
}

/** `initialBalance` is what it was already worth — no account is debited for it. */
export interface InvestmentRequest {
  name: string;
  institution: string;
  investmentType: InvestmentType;
  initialBalance: Money;
  currency: string;
}

/** Money moving between one account and one investment; the endpoint decides the direction. */
export interface InvestmentMovementRequest {
  bankAccountId: Uuid;
  amount: Money;
  transactionDate: IsoDate | null;
  description?: string;
}
