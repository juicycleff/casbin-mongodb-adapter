casbin-mongodb-adapter
===

MongoDB policy storage, implemented as an adapter for [node-casbin](https://github.com/casbin/node-casbin).

<a href="https://img.shields.io/github/package-json/v/juicycleff/casbin-mongodb-adapter" target="_blank">
  <image src="https://img.shields.io/github/package-json/v/juicycleff/casbin-mongodb-adapter" alt="Version" />
</a>
<a href="https://img.shields.io/npm/v/casbin-mongodb-adapter" target="_blank">
  <image src="https://img.shields.io/npm/v/casbin-mongodb-adapter" alt="NPM Version" />
</a>
<a href="https://img.shields.io/codacy/grade/8b44237b493644e788bf0b175708095b/master" target="_blank">
  <image src="https://img.shields.io/codacy/grade/8b44237b493644e788bf0b175708095b/master" alt="Code Quality" />
</a>
<a href="https://img.shields.io/circleci/build/github/juicycleff/casbin-mongodb-adapter/master" target="_blank">
  <image src="https://img.shields.io/circleci/build/github/juicycleff/casbin-mongodb-adapter/master" alt="Build" />
</a>

## Getting Started

Install the package as dependency in your project:

```bash
npm install --save casbin-mongodb-adapter
```

Require it in a place, where you are instantiating an enforcer ([read more about enforcer here](https://github.com/casbin/node-casbin#get-started)):

```javascript
import {newEnforcer, Enforcer} from 'casbin';
import { MongoAdapter } from 'casbin-mongodb-adapter';
import * as path from 'path';

async function myFunction() {
  const model = path.resolve(__dirname, 'casbin-files/rbac_model.conf');

  const adapter = await MongoAdapter.newAdapter({
    uri: 'mongodb://localhost:27017',
    collectionName: 'casbin',
    databaseName: 'node-casbin-official'
  });

  const e = await newEnforcer(model, adapter);

  await e.loadPolicy();

  // Check the permission.
  e.enforce('alice', 'data1', 'read');

  // Modify the policy.
  // await e.addPolicy(...);
  // await e.removePolicy(...);

  // Save the policy back to DB.
  await e.savePolicy();
}
```

That is all what required for integrating the adapter into casbin.
Casbin itself calls adapter methods to persist updates you made through it.

## Configuration

You can pass mongodb-specific options when instantiating the adapter:

```javascript
import { MongoAdapter } from 'casbin-mongodb-adapter';

const adapter = await MongoAdapter.newAdapter({
  uri: 'mongodb://localhost:27017',
  collectionName: 'casbin',
  databaseName: 'node-casbin-official',
  option: {
    ...mongoOptions
  }
});
```

Additional information regard to options you can pass in you can find in [mongodb documentation](https://mongodb.github.io/node-mongodb-native/)

## License

[Apache-2.0](./LICENSE)
