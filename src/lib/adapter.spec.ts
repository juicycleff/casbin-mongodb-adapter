// tslint:disable:no-expression-statement
import test from 'ava';
import {newEnforcer, Enforcer} from 'casbin';
import * as path from 'path';
import { MongoAdapter } from './adapter';

let adapter: MongoAdapter;
const model = path.resolve(__dirname, 'casbin-files/rbac_model.conf');
let e: Enforcer;

test.before('lSetting up Casbin and Adapter', async () => {
  adapter = await MongoAdapter.newAdapter({
    uri: 'mongodb://localhost:27017',
    collectionName: 'casbin',
    databaseName: 'node-casbin-official'
  });
  e = await newEnforcer(model, adapter);
})

test('Load policy', async () => {
  const f = await e.loadPolicy();
  // tslint:disable-next-line: no-console
  console.log(f)
});

test('Check the permission', async () => {
  const f = await e.enforce('alice', 'data1', 'read');
  // tslint:disable-next-line: no-console
  console.log(f)
});

test('Save the policy back to DB', async () => {
  const f = await e.savePolicy();
  // tslint:disable-next-line: no-console
  console.log(f)
});

