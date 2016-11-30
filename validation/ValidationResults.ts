import * as joi from 'joi';
import CtrlError from '../util/CtrlError';

export interface ProviderValidationResult<T> extends joi.ValidationResult<T> {
  provider?: string;
}

export default class ValidationResults extends Array {
  /**
   * Returns if no validation contains at least one error.
   * 
   * @type {boolean}
   * @readonly
   */
  get isValid() {
    return !this.some(v => v.error);
  }

  /**
   * Adds the provided validation result to the collection.
   * dataProvider must be a srting describing the source of the validated
   * data (ie. body, headers, query, params, etc.)
   * 
   * @param {any} dataProvider The source of the validated data.
   * @param {any} validationResult The result generated by joi.
   */
  addValidation<T>(dataProvider: string, validationResult: ProviderValidationResult<T>) {
    this.push(Object.assign({}, validationResult, { provider: dataProvider }));
  }
}