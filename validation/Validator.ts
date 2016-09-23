import * as joi from 'joi';
import * as express from 'express';
import ValidationResults from './ValidationResults';

export type DataAccessor = (req: express.Request) => any;

export interface Validation {
  dataAccessor: DataAccessor;
  providerName: string;
  schema: joi.ObjectSchema;
}

export default  class Validator extends Array<Validation> {
  private validations: Validation[];

  validate(req: express.Request): ValidationResults {
    const result = new ValidationResults();
    this.forEach(v => {
      result.addValidation(v.providerName, joi.validate(v.dataAccessor(req), v.schema));
    });

    return result;
  }
}