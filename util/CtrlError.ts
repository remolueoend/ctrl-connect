import ValidationResults from '../validation/validationResults';

export interface ErrorObject {
  message: string;
  stack?: string;
  code?: string | number;
  status?: number;
  blob?: any;
  innerErr?: ErrorObject;
}

export default class CtrlError extends Error {
  [index: string]: any;
  /**
   * Creates a new CtrlError instance wich can be directly thrown:
   * ```
   * throw new CtrlError(...)
   * ```
   * @constructor
   * @param  {string} message A longer string based description of the error.
   * @return {CtrlError}
   */
  constructor(message: string) {
    super(message);
  }

  /**
   * Returns the message of the current error.
   */
  msg(): string;
  /**
   * Sets the message of the current error.
   * This method is chainable.
   * 
   * @param m The message to set.
   */
  msg(m: string): CtrlError;
  msg(m?: string): CtrlError | string {
    return this.getSet('message', m);
  }

  /**
   * Returns the inner error of the current error.
   */
  innerErr(): Error;
  /**
   * Sets the inner error of the current error.
   * This method is chainable.
   * 
   * @param err The error to set.
   */
  innerErr(err: Error): CtrlError;
  innerErr(err?: Error): Error | CtrlError {
    return this.getSet('_innerError', err);
  }

  /**
   * Returns the blob of the current error.
   */
  blob(): any;
  /**
   * Sets the blob of the current error.
   * This method is chainable.
   * 
   * @param b The blob to set.
   */
  blob(b: any): CtrlError;
  blob(b?: any): any | CtrlError {
    return this.getSet('_blob', b);
  }

  /**
   * Returns the status of the current error.
   */
  status(): number;
  /**
   * Sets the HTTP status of the current error.
   * This method is chainable.
   * 
   * @param s The status to set.
   */
  status(s: number): CtrlError;
  status(s?: number): number | CtrlError {
    return this.getSet('_status', s);
  }

  /**
   * Returns the code of the current error.
   */
  code(): string | number;
  /**
   * Sets the code error of the current error.
   * This method is chainable.
   * 
   * @param c The code to set.
   */
  code(c: number | string): CtrlError;
  code(c?: number | string): string | number | CtrlError {
    return this.getSet('_code', c);
  }

  /**
   * Returns the value of the given property of the current error.
   *
   * @param prop The name of the property. 
   */
  private getSet(prop: string): any;
  /**
   * Sets a property value with the given value.
   * This method is chainable.
   * 
   * @param prop The name of the property.
   * @param val The value to set.
   */
  private getSet(prop: string, val: any): CtrlError;
  private getSet(prop: string, val?: any): any | CtrlError {
    if (typeof val === 'undefined') return this[prop];
    this[prop] = val;
    return this;
  }

  /**
   * Converts and returns the current error to an object which is JSON stringifyable.
   * Inner errors get converted recoursively if possible.
   * 
   * @returns {object} Converted error.
   * 
   * @memberOf CtrlError
   */
  toObject(): ErrorObject {
    let innerErr: ErrorObject | undefined = undefined,
        ie = this.innerErr();
    if (ie) {
      if (ie instanceof CtrlError) {
        innerErr = ie.toObject();
      }
      else {
        innerErr = {
          message: ie.message,
          stack: ie.stack
        };
      }
    }
    return {
      message: this.msg(),
      code: this.code(),
      stack: this.stack,
      blob: this.blob(),
      status: this.status(),
      innerErr
    };
  }

  toJSON() {
    return this.toObject();
  }

  /**
   * Returns a new 404 CtrlError instance which can be directly thrown:
   * ```
   * throw  dCtrlError.notFound(...);
   * ```
   * 
   * @param  {string} [message] A longer string based description of the error.
   * @return {CtrlError}
   */
  static notFound(message?: string) {
    return new CtrlError(message || 'Resource not Found.').status(404).code('not_found');
  }

  /**
   * Returns a new 500 CtrlError instance which can be directly thrown:
   * ```
   * throw  dCtrlError.server(...);
   * ```
   * 
   * @param  {string} [message] A longer string based description of the error.
   * @return {CtrlError}
   */
  static server(message?: string) {
    return new CtrlError(message || 'Internal Server Error').status(500).code('server_error');
  }

  /**
   * Returns a new 400 CtrlError instance which can be directly thrown:
   * ```
   * throw  dCtrlError.client(...);
   * ```
   * @param  {string} [message] A longer string based description of the error.
   * @return {CtrlError}
   */
  static client(message?: string) {
    return new CtrlError(message || 'Client Error').status(400).code('client_error');
  }

  /**
   * Returns a new 422 validation CtrlError instance which can be directly thrown:
   * The blob of the thrown error contains the details for each validation error.
   * ```
   * throw  dCtrlError.validation(validationResults);
   * ```
   * @param  {ValidationResults} valResult A validation result instance. 
   * @param  {string} [message] A longer string based description of the error.
   * @return {CtrlError}
   */
  static validation(valResult: ValidationResults, message?: string) {
    return new CtrlError(message || 'Validation Error')
      .code('validation_error')
      .status(422)
      .blob(!valResult ? [] : valResult.filter(v => v.error).map(v => {
        return {
          message: 'One or more validation errors in request ' + v.provider,
          provider: v.provider,
          details: v.error.details
        };
      }));
  }

  /**
   * Returns a new 401 CtrlError instance which can be directly thrown:
   * ```
   * throw  dCtrlError.notAuthenticated();
   * ```
   * 
   * @param  {string} [message] A longer string based description of the error.
   * @return {CtrlError}
   */
  static unauthorized(message?: string) {
    return new CtrlError(message || 'Unauthorized').code('not_auth').status(401);
  }

  static forbidden(message?: string) {
    return new CtrlError(message || 'Forbidden').code('forbidden').status(403);
  }

  static notImplemented(message?: string) {
    debugger;
    return new CtrlError(message || 'Method or function is not implemented.').status(500).code('not_implemented');
  }

  static badGateway(message?: string) {
    return new CtrlError(message || 'Bad Gateway').code('bad_gateway').status(502);
  }

  static fromObject(err: any) {
    return err instanceof CtrlError ? err : CtrlError.server().innerErr(err);
  }
}