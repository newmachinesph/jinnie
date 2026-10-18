import {test} from 'node:test';
import assert from 'node:assert/strict';
import {formatInputNumber, parseInputNumber, numericEdit, isCalendarDate} from '../input';

test('money editing preserves cents, zero and signed balances without rounding', () => {
  for (const [raw, display] of [['1234567.50','1,234,567.50'],['1000.','1,000.'],['-1000.05','-1,000.05'],['0.00','0.00']]) {
    assert.equal(formatInputNumber(raw), display);
    assert.equal(numericEdit(display, {signed:true}), raw);
  }
});
test('invalid numeric data cannot become a partial financial amount', () => {
  for (const text of ['', ' ', '12abc', '1e3', 'Infinity', '1.2.3', '1000000000000']) assert.ok(Number.isNaN(parseInputNumber(text)), text);
  for (const text of ['-1','1.234','1e3','1,2','abc','1234567890123']) assert.equal(numericEdit(text), null, text);
  assert.equal(numericEdit('12.3', {integer:true}), null);
  assert.equal(numericEdit('0007', {integer:true}), '0007');
  assert.equal(numericEdit('0.000123', {decimals:6}), '0.000123');
});
test('dates validate the calendar including leap years', () => {
  for (const date of ['2024-02-29','2026-12-31']) assert.equal(isCalendarDate(date), true);
  for (const date of ['2026-02-29','2026-02-31','2026-04-31','2026-00-10','2026-01-00','26-01-01','']) assert.equal(isCalendarDate(date), false, date);
});
