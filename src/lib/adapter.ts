import { Adapter, Helper, Model } from 'casbin';
import {
  Collection,
  MongoClient,
  MongoClientOptions,
  Db,
  IndexSpecification
} from 'mongodb';
import { CasbinRule } from './casbin-rule.entity';

interface MongoAdapterOptions {
  readonly uri: string;
  readonly option?: MongoClientOptions;
  readonly databaseName: string;
  readonly collectionName: string;
}

/**
 * TypeORMAdapter represents the TypeORM adapter for policy storage.
 */
export class MongoAdapter implements Adapter {
  /**
   * newAdapter is the constructor.
   * @param adapterOption
   */
  public static async newAdapter(adapterOption: MongoAdapterOptions) {
    const {
      uri,
      option,
      collectionName = 'casbin',
      databaseName = 'casbindb'
    } = adapterOption;

    const a = new MongoAdapter(uri, databaseName, collectionName, option);
    await a.open();
    return a;
  }

  private readonly dbName: string;
  private readonly mongoClient: MongoClient;
  private readonly collectionName: string;

  private constructor(
    uri: string,
    dbName: string,
    collectionName: string,
    option?: MongoClientOptions
  ) {
    if (!uri) {
      throw new Error('You must provide Mongo URI to connect to!');
    }

    // Cache the mongo uri and db name for later use
    this.dbName = dbName;
    this.collectionName = collectionName;

    try {
      // Create a new MongoClient
      this.mongoClient = new MongoClient(uri, {
        ...option,
        useUnifiedTopology: true,
        useNewUrlParser: true,
      });
    } catch (error) {
      throw new Error(error.message);
    }
  }

  public async close() {
    if (this.mongoClient && this.mongoClient.isConnected) {
      await this.mongoClient.close();
    }
  }

  /**
   * loadPolicy loads all policy rules from the storage.
   */
  public async loadPolicy(model: Model) {
    const lines = await this.getCollection()
      .find()
      .toArray();

    for (const line of lines) {
      this.loadPolicyLine(line, model);
    }
  }

  /**
   * savePolicy saves all policy rules to the storage.
   */
  public async savePolicy(model: Model) {
    await this.clearCollection();

    let astMap = model.model.get('p');
    const lines: CasbinRule[] = [];
    // @ts-ignore
    for (const [ptype, ast] of astMap) {
      for (const rule of ast.policy) {
        const line = this.savePolicyLine(ptype, rule);
        lines.push(line);
      }
    }

    astMap = model.model.get('g');
    // @ts-ignore
    for (const [ptype, ast] of astMap) {
      for (const rule of ast.policy) {
        const line = this.savePolicyLine(ptype, rule);
        lines.push(line);
      }
    }

    if (Array.isArray(lines) && lines.length > 0) {
      await this.getCollection().insertMany(lines);
    }

    return true;
  }

  /**
   * addPolicy adds a policy rule to the storage.
   */
  public async addPolicy(_sec: string, ptype: string, rule: string[]) {
    const line = this.savePolicyLine(ptype, rule);
    await this.getCollection().insertOne(line);
  }

  /**
   * removePolicy removes a policy rule from the storage.
   */
  public async removePolicy(_sec: string, ptype: string, rule: string[]) {
    const line = this.savePolicyLine(ptype, rule);
    await this.getCollection().deleteMany(line);
  }

  /**
   * removeFilteredPolicy removes policy rules that match the filter from the storage.
   */
  public async removeFilteredPolicy(
    _sec: string,
    ptype: string,
    fieldIndex: number,
    ...fieldValues: string[]
  ) {
    const line = new CasbinRule();

    line.ptype = ptype;

    if (fieldIndex <= 0 && 0 < fieldIndex + fieldValues.length) {
      line.v0 = fieldValues[0 - fieldIndex];
    }
    if (fieldIndex <= 1 && 1 < fieldIndex + fieldValues.length) {
      line.v1 = fieldValues[1 - fieldIndex];
    }
    if (fieldIndex <= 2 && 2 < fieldIndex + fieldValues.length) {
      line.v2 = fieldValues[2 - fieldIndex];
    }
    if (fieldIndex <= 3 && 3 < fieldIndex + fieldValues.length) {
      line.v3 = fieldValues[3 - fieldIndex];
    }
    if (fieldIndex <= 4 && 4 < fieldIndex + fieldValues.length) {
      line.v4 = fieldValues[4 - fieldIndex];
    }
    if (fieldIndex <= 5 && 5 < fieldIndex + fieldValues.length) {
      line.v5 = fieldValues[5 - fieldIndex];
    }
    await this.getCollection().deleteMany(line);
  }

  async createDBIndex() {
    const indexFields: string[] = ['ptype', 'v0', 'v1', 'v2', 'v3', 'v4', 'v5'];
    const indexes: IndexSpecification[] = [];

    for (const name of indexFields) {
      indexes.push({
        key: {
          name: 1,
        },
        name,
      })
    }
    await this.getCollection().createIndexes(indexes)
  }

  async open() {
    try {
      await this.mongoClient.connect();
      await this.createDBIndex();
    } catch (error) {
      throw new Error(error.message);
    }
  }

  private getCollection(): Collection {
    if (this.mongoClient.isConnected === undefined) {
      throw new Error('Mongo not connected');
    }
    return this.mongoClient.db(this.dbName).collection(this.collectionName);
  }

  private getDatabase(): Db {
    if (this.mongoClient.isConnected === undefined) {
      throw new Error('Mongo not connected');
    }
    return this.mongoClient.db(this.dbName);
  }

  private async clearCollection() {
    try {
      const list = await this.getDatabase()
        .listCollections({ name: this.collectionName })
        .toArray();

      if (list && list.length > 0) {
        await this.getCollection().drop();
      }
      return;
    } catch (error) {
      return;
    }
  }

  private loadPolicyLine(line: CasbinRule, model: Model) {
    const result =
      line.ptype +
      ', ' +
      [line.v0, line.v1, line.v2, line.v3, line.v4, line.v5]
        .filter(n => n)
        .join(', ');
    Helper.loadPolicyLine(result, model);
  }

  private savePolicyLine(ptype: string, rule: string[]): CasbinRule {
    const line = new CasbinRule();

    line.ptype = ptype;
    if (rule.length > 0) {
      line.v0 = rule[0];
    }
    if (rule.length > 1) {
      line.v1 = rule[1];
    }
    if (rule.length > 2) {
      line.v2 = rule[2];
    }
    if (rule.length > 3) {
      line.v3 = rule[3];
    }
    if (rule.length > 4) {
      line.v4 = rule[4];
    }
    if (rule.length > 5) {
      line.v5 = rule[5];
    }

    return line;
  }
}
