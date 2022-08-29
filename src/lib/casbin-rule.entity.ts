import { ObjectId } from 'mongodb';

/**
 * Casbin Entity
 */
export class CasbinRule {
  public _id!: ObjectId;

  public ptype!: string;

  public v0!: string;

  public v1!: string;

  public v2!: string;

  public v3!: string;

  public v4!: string;

  public v5!: string;

  public createdAt?: Date | string;

  public updatedAt?: Date | string;

  constructor() {
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }
}
