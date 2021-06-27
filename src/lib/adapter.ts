import { Helper, Model, BatchAdapter, FilteredAdapter } from 'casbin';
import {
  Collection,
  MongoClient,
  MongoClientOptions,
  Db,
  FilterQuery
} from 'mongodb';
import logdown from 'logdown';
import { CasbinRule } from './casbin-rule.entity';

interface MongoAdapterOptions {
  readonly uri: string;
  readonly option?: MongoClientOptions;
  readonly database: string;
  readonly collection: string;
  readonly filtered?: boolean;
  readonly debug?: boolean;
}

const logger = logdown('CasbinMongoAdapter');

/**
 * TypeORMAdapter represents the TypeORM adapter for policy storage.
 */
export class MongoAdapter implements FilteredAdapter, BatchAdapter {
  /**
   * newAdapter is the constructor.
   * @param adapterOption
   */
  public static async newAdapter(adapterOption: MongoAdapterOptions) {
    const {
      uri,
      option,
      collection = 'casbin',
      database = 'casbindb',
      filtered = false,
      debug = false
    } = adapterOption;

    logger.state.isEnabled = debug;

    const a = new MongoAdapter(uri, database, collection, filtered, option);
    await a.open();
    return a;
  }

  public useFilter: boolean = false;

  private readonly databaseName: string;
  private readonly mongoClient: MongoClient;
  private readonly collectionName: string;

  private constructor(
    uri: string,
    database: string,
    collection: string,
    filtered: boolean,
    option?: MongoClientOptions
  ) {
    if (!uri) {
      throw new Error('you must provide mongo URI to connect to!');
    }

    // Cache the mongo uri and db name for later use
    this.databaseName = database;
    this.collectionName = collection;
    this.useFilter = filtered;

    try {
      // Create a new MongoClient
      this.mongoClient = new MongoClient(uri, option);
    } catch (error) {
      throw new Error(error.message);
    }
  }

  isFiltered(): boolean {
    return this.useFilter;
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
    await this.loadFilteredPolicy(model);
  }

  /**
   * loadPolicy loads filtered policy rules from the storage.
   */
  public async loadFilteredPolicy(model: Model, filter?: FilterQuery<any>) {
    try {
      let lines;

      if (this.useFilter) {
        lines = await this.getCollection()
          .find(filter)
          .toArray();
      } else {
        lines = await this.getCollection()
          .find()
          .toArray();
      }

      for (const line of lines) {
        this.loadPolicyLine(line, model);
      }
    } catch (e) {
      logger.error(e);
      throw new Error(e);
    }
  }

  /**
   * savePolicy saves all policy rules to the storage.
   */
  public async savePolicy(model: Model) {
    await this.clearCollection();

    let astMap = model.model.get('p');
    const lines: CasbinRule[] = [];

    if (!astMap) {
      return false;
    }

    for (const [ptype, ast] of astMap) {
      for (const rule of ast.policy) {
        const line = this.savePolicyLine(ptype, rule);
        lines.push(line);
      }
    }

    astMap = model.model.get('g');
    if (!astMap) {
      return false;
    }

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
    await this.getCollection().deleteOne(line);
  }

  /**
   * addPolicies adds many policies with rules to the storage.
   */
  public async addPolicies(
    _sec: string,
    ptype: string,
    rules: string[][]
  ): Promise<void> {
    const lines = [];
    for (const r of rules) {
      lines.push(this.savePolicyLine(ptype, r));
    }
    await this.getCollection().insertMany(lines);
  }

  /**
   * removeFilteredPolicy removes many policy rules from the storage.
   */
  public async removePolicies(
    _sec: string,
    ptype: string,
    rules: string[][]
  ): Promise<void> {
    const lines = [];
    for (const r of rules) {
      lines.push(this.savePolicyLine(ptype, r));
    }

    const promises: Array<Promise<any>> = [];

    for (const line of lines) {
      promises.push(this.getCollection().deleteOne(line));
    }

    await Promise.all(promises);
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

  public async createDBIndex() {
    try {
      const indexFields: string[] = [
        'ptype',
        'v0',
        'v1',
        'v2',
        'v3',
        'v4',
        'v5'
      ];

      for (const name of indexFields) {
        await this.getCollection().createIndex({ [name]: 1 });
      }
      logger.info('Indexes created');
    } catch (e) {
      logger.error(e);
    }
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
      throw new Error('Casbin mongo adapter not connected');
    }
    return this.mongoClient
      .db(this.databaseName)
      .collection(this.collectionName);
  }

  private getDatabase(): Db {
    if (this.mongoClient.isConnected === undefined) {
      throw new Error('Casbin mongo adapter not connected');
    }
    return this.mongoClient.db(this.databaseName);
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
