
import {Adapter, Helper, Model} from 'casbin';
import {Collection, Db, MongoClient, MongoClientOptions} from 'mongodb';
import {CasbinRule} from './casbin-rule.entity';

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
     * @param option mongo connection option
     */
    public static async newAdapter(adapterOption: MongoAdapterOptions) {
      const { uri = 'mongodb://localhost:27017', option, collectionName = 'casbin', databaseName = 'node-casbin-official' } = adapterOption;
      const a = new MongoAdapter(uri, databaseName, collectionName, option);
      a.open();
      return a;
    }

    private dbName: string;
    private mongoClient: MongoClient;
    private collectionName: string;
    private mongoDb!: Db;

    private constructor(uri: string, dbName: string, collectionName: string, option?: MongoClientOptions) {
      if (!uri || typeof uri !== 'string') {
        throw new Error('You must provide Mongo URI to connect to!');
      }

      // Cache the mongo uri and db name for later use
      this.dbName = dbName;
      this.collectionName = collectionName;

      // Create a new MongoClient
      this.mongoClient = new MongoClient(uri, option);

      // Use connect method to connect to the Server
      this.mongoClient.connect((err) => {
        if (err) {
          // tslint:disable-next-line: no-console
          console.log('Connected correctly to mongo db');
        }
        this.mongoDb = this.mongoClient.db(dbName);
      });

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
        const lines = await this.getCollection().find().toArray();

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
        await this.getCollection().save(lines);

        return true;
    }

    /**
     * addPolicy adds a policy rule to the storage.
     */
    public async addPolicy(_sec: string, ptype: string, rule: string[]) {
        const line = this.savePolicyLine(ptype, rule);
        await this.getCollection().save(line);
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
    public async removeFilteredPolicy(_sec: string, ptype: string, fieldIndex: number, ...fieldValues: string[]) {
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

    private async open() {
        if (this.mongoClient && !this.mongoClient.isConnected) {
            this.mongoClient.connect((err) => {
            if (err) {
              // tslint:disable-next-line: no-console
              console.log('Connected correctly to mongo db');
            }
            this.mongoDb = this.mongoClient.db(this.dbName);
          });
        }
    }

    private getCollection(): Collection {
      return this.mongoDb.collection(this.collectionName);
    }


    private async clearCollection() {
      await this.getCollection().drop();
    }

    private loadPolicyLine(line: CasbinRule, model: Model) {
        const result = line.ptype + ', ' + [line.v0, line.v1, line.v2, line.v3, line.v4, line.v5].filter(n => n).join(', ');
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
