import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form, FormField, min, minLength, required } from '@angular/forms/signals';
import { providePrimeNG } from 'primeng/config';
import { beforeEach, describe, expect, it } from 'vitest';

import { ACCOUNT_TYPE_OPTIONS } from '../util/enum-labels';
import { AccountType } from '../models/enums';
import { PlanelyxDatePicker } from './date-picker';
import { PlanelyxMoneyInput } from './money-input';
import { PlanelyxNumberInput } from './number-input';
import { PlanelyxSelect } from './select';
import { PlanelyxSwitch } from './switch';
import { PlanelyxTextInput } from './text-input';
import { PlanelyxTextarea } from './textarea';

/**
 * Every wrapper bound through `[formField]` at once.
 *
 * PrimeNG controls are `ControlValueAccessor`s, which `[formField]` does not bind as
 * signal-forms controls — the wrappers exist to implement `FormValueControl` /
 * `FormCheckboxControl` instead. This host proves each one actually satisfies that
 * contract, at compile time and at runtime.
 */
@Component({
  imports: [
    FormField,
    PlanelyxTextInput,
    PlanelyxTextarea,
    PlanelyxNumberInput,
    PlanelyxMoneyInput,
    PlanelyxDatePicker,
    PlanelyxSelect,
    PlanelyxSwitch,
  ],
  template: `
    <planelyx-text-input [formField]="f.name" label="Name" />
    <planelyx-textarea [formField]="f.notes" label="Notes" />
    <planelyx-number-input [formField]="f.day" label="Day" />
    <planelyx-money-input [formField]="f.amount" label="Amount" />
    <planelyx-date-picker [formField]="f.date" label="Date" />
    <planelyx-select [formField]="f.accountType" label="Type" [options]="accountTypes" />
    <planelyx-switch [formField]="f.enabled" label="Enabled" />
  `,
})
class AllControlsHost {
  readonly accountTypes = ACCOUNT_TYPE_OPTIONS;

  readonly model = signal({
    name: '',
    notes: '',
    day: null as number | null,
    amount: 0,
    date: null as string | null,
    accountType: null as AccountType | null,
    enabled: false,
  });

  readonly f = form(this.model, (path) => {
    required(path.name, { message: 'Name is required.' });
    minLength(path.name, 2);
    min(path.amount, 0.01);
    required(path.date);
    required(path.accountType);
  });
}

describe('planelyx control wrappers', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [providePrimeNG({})] });
  });

  it('all seven bind through [formField] without error', () => {
    const fixture = TestBed.createComponent(AllControlsHost);
    fixture.detectChanges();

    expect(fixture.debugElement.children).toHaveLength(7);
  });

  it('writes from a control reach the form model', () => {
    const fixture = TestBed.createComponent(AllControlsHost);
    fixture.detectChanges();

    const host = fixture.componentInstance;
    const text = fixture.debugElement.children[0].componentInstance as PlanelyxTextInput;
    const money = fixture.debugElement.children[3].componentInstance as PlanelyxMoneyInput;
    const toggle = fixture.debugElement.children[6].componentInstance as PlanelyxSwitch;

    text.value.set('Groceries');
    money.value.set(42.5);
    toggle.checked.set(true);
    fixture.detectChanges();

    expect(host.model().name).toBe('Groceries');
    expect(host.model().amount).toBe(42.5);
    expect(host.model().enabled).toBe(true);
  });

  it('pushes validation state from the schema down into each control', () => {
    const fixture = TestBed.createComponent(AllControlsHost);
    fixture.detectChanges();

    const host = fixture.componentInstance;
    const text = fixture.debugElement.children[0].componentInstance as PlanelyxTextInput;

    expect(host.f.name().invalid()).toBe(true);
    expect(text.invalid()).toBe(true);
    expect(text.required()).toBe(true);
    expect(text.errors().map((e) => e.message)).toContain('Name is required.');

    text.value.set('Rent');
    fixture.detectChanges();

    expect(host.f.name().invalid()).toBe(false);
    expect(text.invalid()).toBe(false);
  });

  it('marks the field touched when a control emits touch', () => {
    const fixture = TestBed.createComponent(AllControlsHost);
    fixture.detectChanges();

    const host = fixture.componentInstance;
    const text = fixture.debugElement.children[0].componentInstance as PlanelyxTextInput;

    expect(host.f.name().touched()).toBe(false);

    text.touch.emit();
    fixture.detectChanges();

    expect(host.f.name().touched()).toBe(true);
  });

  it('form validity aggregates across all wrapped controls', () => {
    const fixture = TestBed.createComponent(AllControlsHost);
    fixture.detectChanges();

    const host = fixture.componentInstance;
    expect(host.f().invalid()).toBe(true);

    (fixture.debugElement.children[0].componentInstance as PlanelyxTextInput).value.set('Rent');
    (fixture.debugElement.children[3].componentInstance as PlanelyxMoneyInput).value.set(1200);
    (fixture.debugElement.children[4].componentInstance as PlanelyxDatePicker).value.set(
      '2026-08-03',
    );
    (fixture.debugElement.children[5].componentInstance as PlanelyxSelect<AccountType>).value.set(
      'CHECKING',
    );
    fixture.detectChanges();

    expect(host.f().invalid()).toBe(false);
  });
});
