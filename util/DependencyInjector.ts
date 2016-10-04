import * as express from 'express';
import {ActionFn} from './types';
import {prop} from './object-helper';

// See: http://stackoverflow.com/questions/1007981/how-to-get-function-parameter-names-values-dynamically-from-javascript
const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg,
      ARGUMENT_NAMES = /([^\s,]+)/g;

interface IInjectorMethod {
  (): any;
}

export interface IDependencyInjector {
  getParams: (action: ActionFn) => Array<any>;
}
export interface IDependencyInjectorType {
  new(req: express.Request, res: express.Response, next: express.NextFunction): IDependencyInjector;
}

export default class DependencyInjector implements IDependencyInjector {
  constructor(protected req: express.Request, protected res: express.Response, protected next: express.NextFunction) {
  }

  /**
   * Returns an array of resolved parameter values for the given action method.
   * 
   * @param {ActionFn} action The action method to resolve.
   * @returns {Array<any>}
   */
  public getParams(action: ActionFn): Array<any> {
    return this.resolveActionParameters(action).map(p => {
      const i = this.resolveInjector(p);
      return i ? i.call(this) : undefined;
    });
  }

  /**
   * Returns an injector method depending on the provided parameter name.
   * 
   * @protected
   * @param {string} paramName
   * @returns
   * 
   * @memberOf DependencyInjector
   */
  protected resolveInjector(paramName: string) {
    return this.constructor.prototype['inject_' + paramName];
  }

  /**
   * Returns an array of parameter names defined by the given method of the current instance.
   * @param  method The method to parse.
   */
  protected resolveActionParameters(method: ActionFn) {
    const fnStr = method.toString().replace(STRIP_COMMENTS, '');
    return fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES) || [];
  }

  protected inject_$req() {
    return this.req;
  }

  protected inject_$res() {
    return this.res;
  }

  protected inject_$query() {
    return this.req.query;
  }

  protected inject_$params() {
    return this.req.params;
  }

  protected inject_$body() {
    return prop(this.req, 'body');
  }

  protected inject_$headers() {
    return this.req.headers;
  }
}