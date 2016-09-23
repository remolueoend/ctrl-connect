import * as express from 'express';
import {ActionFn} from './types';

// See: http://stackoverflow.com/questions/1007981/how-to-get-function-parameter-names-values-dynamically-from-javascript
const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg,
      ARGUMENT_NAMES = /([^\s,]+)/g;

interface IInjectorMethod {
  (): any;
}

export default class DependencyInjector {
  constructor(private req: express.Request, private next: express.NextFunction) {
  }

  /**
   * Returns an array of resolved parameter values for the given action method.
   * 
   * @param {ActionFn} action The action method to resolve.
   * @returns {Array<any>}
   */
  public getParams(action: ActionFn): Array<any> {
    return this._resolveActionParameters(action).map(p => {
      const i = this.resolveInjector(p);
      return i ? i.call(this) : undefined;
    });
  }

  private resolveInjector(paramName: string) {
    const descr = Object.getOwnPropertyDescriptor(this.constructor.prototype, paramName);
    return descr && typeof descr.value === 'function' ? <IInjectorMethod>descr.value : undefined;
  }

  /**
   * Returns an array of parameter names defined by the given method of the current instance.
   * @param  method The method to parse.
   */
  private _resolveActionParameters(method: ActionFn) {
    const fnStr = method.toString().replace(STRIP_COMMENTS, '');
    return fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES) || [];
  }

  private inject_$query() {
    return this.req.query;
  }
}