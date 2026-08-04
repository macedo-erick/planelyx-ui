import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form, FormField, required } from '@angular/forms/signals';
import { providePrimeNG } from 'primeng/config';
import { beforeEach, describe, expect, it } from 'vitest';

import { toIsoDate } from '../util/date';
import { PlanelyxDatePicker } from './date-picker';

@Component({
  imports: [FormField, PlanelyxDatePicker],
  template: `<planelyx-date-picker [formField]="f.date" label="Date" />`,
})
class Host {
  readonly model = signal<{ date: string | null }>({ date: '2026-08-03' });
  readonly f = form(this.model, (path) => {
    required(path.date, { message: 'Pick a date.' });
  });
}

describe('PlanelyxDatePicker', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [providePrimeNG({})] });
  });

  it('binds the field value through [formField]', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const control = fixture.debugElement.children[0].componentInstance as PlanelyxDatePicker;
    expect(control.value()).toBe('2026-08-03');
  });

  it('writes back an IsoDate string, not a Date', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const control = fixture.debugElement.children[0].componentInstance as PlanelyxDatePicker;
    control.value.set(toIsoDate(new Date(2026, 11, 25)));
    fixture.detectChanges();

    expect(fixture.componentInstance.model().date).toBe('2026-12-25');
    expect(typeof fixture.componentInstance.model().date).toBe('string');
  });

  it('propagates a cleared value as null and marks the field invalid', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const control = fixture.debugElement.children[0].componentInstance as PlanelyxDatePicker;
    control.value.set(null);
    fixture.detectChanges();

    expect(fixture.componentInstance.model().date).toBeNull();
    expect(fixture.componentInstance.f.date().invalid()).toBe(true);
  });

  it('surfaces the schema error message to the control', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const host = fixture.componentInstance;
    const control = fixture.debugElement.children[0].componentInstance as PlanelyxDatePicker;

    control.value.set(null);
    host.f.date().markAsTouched();
    fixture.detectChanges();

    expect(control.errors().map((error) => error.message)).toContain('Pick a date.');
  });
});
