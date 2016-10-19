import * as express from 'express';
import {ActionFn} from './types';
import {prop} from './object-helper';
import * as http from 'http';
import * as urlHelper from 'url';
import RequestContext from '../RequestContext';
import response from './response';

declare module 'http' {
  export interface IncomingMessage {
    params: { [index: string]: string; };
    query: { [index: string]: string; };
    body: any;
  }
}

// See: http://stackoverflow.com/questions/1007981/how-to-get-function-parameter-names-values-dynamically-from-javascript
const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg,
      ARGUMENT_NAMES = /([^\s,]+)/g;

interface IInjectorMethod {
  (): any;
}

interface NextFunction {
  (err?: any): void;
}

export interface IDependencyInjector {
  getParams: (action: ActionFn) => Array<any>;
}
export interface IDependencyInjectorType {
  new(req: http.IncomingMessage, res: http.ServerResponse, next: NextFunction, context: RequestContext): IDependencyInjector;
}

export default class DependencyInjector implements IDependencyInjector {
  constructor(
    protected req: http.IncomingMessage,
    protected res: http.ServerResponse,
    protected next: NextFunction,
    protected context: RequestContext) {
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

  private _query: any;

  /**
   * Returns the current request's query string as a parsed object. 
   * 
   * @protected
   * @returns
   * 
   * @memberOf DependencyInjector
   */
  protected inject_$query() {
    return this.req.query || (this._query || (this._query = urlHelper.parse(this.req.url || '', true).query));
  }

  protected inject_$params() {
    return this.req.params || {};
  }

  protected inject_$body() {
    return this.req.body || {};
  }

  protected inject_$headers() {
    return this.req.headers;
  }

  protected inject_$next() {
    return this.next;
  }

  protected inject_$context() {
    return this.context;
  }

  protected inject_$resp() {
    return response(this.inject_$res(), this.inject_$next);
  }
}