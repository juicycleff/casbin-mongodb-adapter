// tslint:disable:no-expression-statement
// tslint:disable-next-line: no-implicit-dependencies
import test from 'ava';
import {newEnforcer, Enforcer} from 'casbin';
import * as path from 'path';
import { MongoAdapter } from './adapter';

let adapter: MongoAdapter;
const model = path.resolve(__dirname, 'casbin-files/rbac_model.conf');
let e: Enforcer;

test.before('Setting up Casbin and Adapter', async () => {

  try {
    adapter = await MongoAdapter.newAdapter({
      uri: 'mongodb://localhost:27017/demo',
      collectionName: 'casbin',
      databaseName: 'casbindb'
    });
    e = await newEnforcer(model, adapter);
  } catch (error) {
    throw new Error(error.message);

  }
})

test('Add policy', async t => {
  t.truthy(e.addPolicy('alice', 'data3', 'read'));
});

test('Save the policy back to DB', async t => {
  t.true(await e.savePolicy());
});


test('Load policy', async t => {
  t.deepEqual(await e.loadPolicy(), undefined);
});

test('Check alice permission', async t => {
  t.truthy(await e.enforce('alice', 'data1', 'read'));
});

