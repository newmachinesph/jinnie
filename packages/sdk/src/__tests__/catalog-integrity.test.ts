import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {
  billerCategories,
  billers,
  financialProviders,
  getBiller,
  getProvider,
  getTransactionCategory,
  transactionCategories,
  type CatalogIcon,
} from '../catalogs';
import {createDemoData} from '../demo-data';
import {logos} from '../logos';

/*
 * Data that ships inside the bundle and is only ever exercised on a device.
 * A bad row here shows up as a blank mark, a raw id in a list, or a crash in
 * react-native-svg's parser — none of which a typecheck can see.
 */

describe('Catalog data integrity', () => {
  it('uses unique ids everywhere a picker persists one', () => {
    for (const list of [transactionCategories, financialProviders, billers, billerCategories]) {
      const ids = list.map(item => item.id);
      assert.equal(new Set(ids).size, ids.length, `duplicate id in ${ids.join(',')}`);
    }
  });

  it('points every biller and biller category at a real category', () => {
    for (const category of billerCategories) {
      assert.ok(
        getTransactionCategory(category.transactionCategoryId),
        `${category.id} → ${category.transactionCategoryId}`,
      );
    }
    for (const biller of billers) {
      assert.ok(billerCategories.some(c => c.id === biller.categoryId), `${biller.id} → ${biller.categoryId}`);
    }
  });

  it('names a glyph the icon set can draw for every category', () => {
    const known: CatalogIcon[] = [
      'bank', 'wallet', 'card', 'cash', 'globe', 'send', 'chart', 'food', 'transport',
      'home', 'utilities', 'health', 'education', 'government', 'other',
    ];
    for (const category of transactionCategories) {
      assert.ok(known.includes(category.icon), `${category.id} uses unknown glyph ${category.icon}`);
    }
  });
});

describe('Sample profile integrity', () => {
  it('references only ids the catalog and its own rows define', () => {
    const demo = createDemoData(new Date(2026, 8, 5));
    const accountIds = new Set(demo.accounts.map(a => a.id));
    const billIds = new Set(demo.bills.map(b => b.id));
    const txIds = new Set(demo.transactions.map(t => t.id));

    for (const account of demo.accounts) assert.ok(getProvider(account.providerId), account.id);
    for (const tx of demo.transactions) {
      assert.ok(getTransactionCategory(tx.category), `${tx.id} category ${tx.category}`);
      if (tx.accountId) assert.ok(accountIds.has(tx.accountId), `${tx.id} account`);
      if (tx.toAccountId) assert.ok(accountIds.has(tx.toAccountId), `${tx.id} toAccount`);
      if (tx.billId) assert.ok(billIds.has(tx.billId), `${tx.id} bill`);
    }
    for (const bill of demo.bills) {
      if (bill.billerId) assert.ok(getBiller(bill.billerId), `${bill.id} biller ${bill.billerId}`);
      if (bill.categoryId) assert.ok(billerCategories.some(c => c.id === bill.categoryId), `${bill.id} category`);
      if (bill.paymentAccountId) assert.ok(accountIds.has(bill.paymentAccountId), `${bill.id} account`);
      if (bill.lastPaymentTransactionId) assert.ok(txIds.has(bill.lastPaymentTransactionId), `${bill.id} payment`);
    }
    for (const limit of demo.budgets) assert.ok(getTransactionCategory(limit.categoryId), limit.id);
    for (const debt of demo.debts) if (debt.accountId) assert.ok(accountIds.has(debt.accountId), debt.id);
    for (const remit of demo.remittances) assert.ok(getProvider(remit.channel), `${remit.id} channel`);
  });
});

describe('Bundled logos', () => {
  const UNSUPPORTED = ['<text', '<image', '<style', '<filter', '<foreignObject', '<pattern', '<switch', 'data:image', '&quot;'];

  it('are keyed by a catalog id and are one renderable <svg> each', () => {
    assert.ok(Object.keys(logos).length >= 20, 'logo set unexpectedly small');
    for (const [id, svg] of Object.entries(logos)) {
      assert.ok(getProvider(id) ?? getBiller(id), `${id} is not a provider or biller`);
      assert.ok(svg.startsWith('<svg'), `${id} does not start with <svg`);
      assert.match(svg, /viewBox="[\d.\- ]+"/, `${id} has no viewBox`);
      assert.doesNotMatch(svg, /^<svg[^>]*\s(width|height)=/, `${id} carries intrinsic dimensions`);
      for (const feature of UNSUPPORTED) assert.ok(!svg.includes(feature), `${id} contains ${feature}`);
      // Every style declaration must be `prop: value`; the renderer throws otherwise.
      for (const style of svg.matchAll(/style="([^"]*)"/g)) {
        for (const declaration of style[1].split(';')) {
          if (declaration.trim()) assert.ok(declaration.includes(':'), `${id} style "${declaration}"`);
        }
      }
      assert.ok(svg.length < 40_000, `${id} is ${svg.length} bytes`);
    }
  });
});
