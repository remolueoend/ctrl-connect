import 'reflect-metadata';
import { methodDecorator } from '../util/metaDecorator';
import * as joi from 'joi';
import * as express from 'express';
import Validator, { DataAccessor } from './Validator';

const metaKey = Symbol('ctrl-connect.validator');

const providerMapping = new Map<string, DataAccessor>([
  ['query', (req: express.Request) => req.query]
]);
const defaultProvider = (req: express.Request) => undefined;

/**
 * Add this decorator to an action to attach a validation for a specific data provider. 
 * 
 * @export
 * @param {string} provider The name of the request data provider (body, query, params, etc.) 
 * @param {joi.ObjectSchema} schema The schema to use for validation.
 */
export default function validate(provider: string, schema: joi.ObjectSchema) {
  return methodDecorator(metaKey, (currentValue: Validator) => {
    const v = currentValue || new Validator();
    v.push({ providerName: provider, dataAccessor: providerMapping.get(provider) || defaultProvider, schema: schema });
    return v;
  });
}

export function getValidator(target: any, property: string): Validator {
  return Reflect.getMetadata(metaKey, target, property) || new Validator();
}

/**
 * Add this decorator to an action to validate the request query against the specified schema. 
 * 
 * @export
 * @param {joi.ObjectSchema} schema The schema to use for validation.
 */
export function validateQuery(schema: joi.SchemaMap) {
  return validate('query', joi.object(schema));
}