// tslint:disable:no-expression-statement no-implicit-dependencies
import test from 'ava';
import { newEnforcer, Enforcer, newModel } from 'casbin';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoAdapter } from './adapter';

// Start MongoDB instance
const mongod = new MongoMemoryServer();

let adapter: MongoAdapter;
let e: Enforcer;

const m = newModel();
m.addDef('r', 'r', 'sub, obj, act');
m.addDef('p', 'p', 'sub, obj, act');
m.addDef('g', 'g', '_, _');
m.addDef('e', 'e', 'some(where (p.eft == allow))');
m.addDef('m', 'm', 'g(r.sub, p.sub) && r.obj == p.obj && r.act == p.act');

test.before('Setting up Casbin and Adapter', async () => {
  try {
    const uri = await mongod.getUri();
    adapter = await MongoAdapter.newAdapter({
      uri,
      collection: 'casbin',
      database: 'casbindb'
    });
    e = await newEnforcer(m, adapter);
  } catch (error: any) {
    throw new Error(error.message);
  }
});

test('Missing Mongo URI', async t => {
  const error = await t.throwsAsync(
    MongoAdapter.newAdapter({
      // @ts-ignore
      uri: null,
      collection: 'casbin',
      database: 'casbindb'
    })
  );
  t.is(error.message, 'you must provide mongo URI to connect to!');
});

test('Wrong Mongo Connection String', async t => {
  const error = await t.throwsAsync(
    MongoAdapter.newAdapter({
      uri: 'wrong',
      collection: 'casbin',
      database: 'casbindb'
    })
  );
  t.is(error.message, 'Invalid connection string');
});

test('Open adapter connection', async t => {
  await t.notThrowsAsync(adapter.open());
});

test('Creates DB indexes', async t => {
  await t.notThrowsAsync(adapter.createDBIndex());
});

test('Add policy', t => {
  t.truthy(e.addPolicy('alice', 'data3', 'read'));
});

test('Save the policy back to DB', async t => {
  t.true(await e.savePolicy());
});

test('Load policy', async t => {
  t.deepEqual(await e.loadPolicy(), undefined);
});

test('Check alice permission', async t => {
  t.falsy(await e.enforce('alice', 'data1', 'read'));
});

test('Save policy against adapter', async t => {
  t.true(await adapter.savePolicy(m));
});

test('Add policy against adapter', async t => {
  await t.notThrowsAsync(adapter.addPolicy('alice', 'data5', ['read']));
});

test('Add policies successfully', async t => {
  await t.notThrowsAsync(
    adapter.addPolicies('', 'john', [['create'], ['write']])
  );
});

test('Removes policies successfully', async t => {
  await t.notThrowsAsync(
    adapter.removePolicies('', 'john', [['create'], ['write']])
  );
});

test('Remove filtered policy against adapter', async t => {
  await t.notThrowsAsync(
    adapter.removeFilteredPolicy('alice', 'data5', 0, 'read')
  );
});

test('Remove policy against adapter', async t => {
  await t.notThrowsAsync(adapter.removePolicy('alice', 'data5', ['read']));
});

test.after('Close connection', async t => {
  t.notThrows(async () => adapter.close());
});
