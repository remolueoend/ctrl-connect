import * as joi from 'joi';
import * as http from 'http';
import ValidationResults from './ValidationResults';
import CtrlError from '../util/CtrlError';

export type DataAccessor = (req: http.IncomingMessage) => any;

declare module 'http' {
  export interface IncomingMessage {
    [index: string]: any;
    params: { [index: string]: string; };
    query: { [index: string]: string; };
    body: any;
  }
}

export interface IValidatorFunction {
  (requestData: any): joi.ValidationResult<any>;
}

export interface Validation {
  dataAccessor?: DataAccessor;
  providerName: string;
  validator: IValidatorFunction;
}

function schemaValidator (schema: joi.ObjectSchema): IValidatorFunction {
  return (reqData: any) =>
    joi.validate(reqData, schema, { abortEarly: false, stripUnknown: true, presence: 'required' });
}

export default class Validator extends Array<Validation> {

  addValidation(validator: Validator): this;
  addValidation(provider: string, schema: joi.ObjectSchema, accessor?: DataAccessor): this;
  addValidation(provider: string, validator: IValidatorFunction, accessor?: DataAccessor): this;
  addValidation(provider: Validator | string, schema?: joi.ObjectSchema | IValidatorFunction, accessor?: DataAccessor): this {
    if (provider instanceof Validator) {
      provider.forEach(v => this.push(v));
    }
    else if (schema) {
      const schemaValidatorFn = typeof schema === 'function' ? schema : schemaValidator(schema);
      this.push({ providerName: provider, validator: schemaValidatorFn, dataAccessor: accessor });
    }
    else {
      throw CtrlError.server('No validation schema provided.');
    }

    return this;
  }

  validate(req: http.IncomingMessage): ValidationResults {
    const valResult = new ValidationResults();
    this.forEach(v => {
      const reqVal = (v.dataAccessor ? v.dataAccessor(req) : req[v.providerName]) || {};
      const res = v.validator(reqVal);
      valResult.addValidation(v.providerName, res);
      if (!res.error) req[v.providerName] = res.value;
    });

    return valResult;
  }
}