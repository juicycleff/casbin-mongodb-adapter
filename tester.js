var { MongoAdapter } = require('./build/main/index')
var { newEnforcer } = require('casbin')
var path = require('path')

let adapter;
const model = path.resolve(__dirname, 'casbin-files/rbac_model.conf');
let e;

async function Test () {

  try {
    adapter = await MongoAdapter.newAdapter({
      uri: 'mongodb://localhost:27017/demo',
      collectionName: 'casbin',
      databaseName: 'casbindb'
    });
    e = await newEnforcer(model, adapter);

    const s = await e.savePolicy();
    const f = await e.loadPolicy();
    const g = await e.enableAutoSave(true);
    const h = await e.enforce('alice', 'data3', 'read');
    const j = await e.addPolicy("alice", "data3", "read");
    // tslint:disable-next-line: no-console
    console.log(f, s, g, h, j)

    console.log('adapter')
  } catch (error) {
    console.log(error);
  }
}

Test();
