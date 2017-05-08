import * as http from 'http';
import CtrlError from './util/CtrlError';
import publicAction from './util/publicAction';
import { Action, ActionFn } from './util/types';
import DependencyInjector, { IDependencyInjectorType } from './util/DependencyInjector';
import validate, { getValidator } from './validation/validate';
import Validator from './validation/Validator';
import response from './util/response';
import RequestContext from './RequestContext';

export default class BaseController {

  protected injectoryType: IDependencyInjectorType;

  constructor() {
    this.injectoryType = DependencyInjector;
  }

  /**
   * Gets called before an action is called. If a promise is returned,
   * execution of the action is delayed until promise is resolved.
   * 
   * @protected
   * @param {http.IncomingMessage} $req
   * @param {http.ServerResponse} res
   * @param {ActionFn} action The action which will be called.
   * @returns {(Promise<undefined> | undefined)}
   * 
   * @memberOf BaseController
   */
  protected beforeCall(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    action: ActionFn,
    context: RequestContext): Promise<undefined> | void {

    context.validator.addValidation(getValidator(this.constructor.prototype, action.name));
    const validationResult = context.validator.validate(req);
    if (!validationResult.isValid) {
      throw CtrlError.validation(validationResult);
    }
  }

  /**
   * Gets called after an action was called and result was written to response. 
   * 
   * @protected
   * @param {http.IncomingMessage} $req
   * @param {http.ServerResponse} res
   * @param {ActionFn} action The action which was called.
   * 
   * @memberOf BaseController
   */
  protected afterCall(req: http.IncomingMessage, res: http.ServerResponse, action: ActionFn, context: RequestContext): void {
  }

  /**
   * Tries to call the provided action and writes the result to the client response.
   * Any errors are redirected using next(err). 
   * 
   * @param {Action} action The action to call.
   * @param {http.IncomingMessage} req Current client request.
   * @param {http.ServerResponse} res Current client response.
   * @param {Function} next middleware function.
   * @param {boolean} [throwIfNotFound=false] Set to true if a server error should be thrown
   * when action could not be found. Default behavior is calling next().
   */
  protected callAction(
    action: Action, req: http.IncomingMessage,
    res: http.ServerResponse,
    next: (err: any) => any,
    throwIfNotFound?: boolean): void {

    const actionFn = this.resolveActionFn(action);
    if (!actionFn) {
      return next(!throwIfNotFound ? null : CtrlError.server('Could not find the desired action in the current controller')
        .code('invalid_action')
        .blob({
          controller: this.constructor.name,
          action: action
        }));
    }

    const context = new RequestContext(req),
          injector = new this.injectoryType(req, res, next, context);
    try {
      this.resolvePromise(this.beforeCall(req, res, actionFn, context)).then(() => {
        const actionResult = actionFn.apply(this, injector.getParams(actionFn));
        if (typeof actionResult !== 'undefined') {
          return this.resolvePromise(actionResult).then(r => this.writeResult(res, r, next));
        }
      })
        .catch(err => next(err))
        .then(() => this.afterCall(req, res, actionFn, context))
        .catch(err => next(err));
    }
    catch (err) {
      return next(err);
    }
  }

  /**
   * Writes the provided data to the response.
   * 
   * @protected
   * @param {http.ServerResponse} res The current response object.
   * @param {*} data The data to write.
   */
  protected writeResult(res: http.ServerResponse, data: any, next: (err?: any) => any) {
    const resp = response(res, next);
    if (data instanceof Uint8Array || data instanceof ArrayBuffer) {
      resp.write({
        data,
        headers: { 'Content-Type': 'application/octet-stream' }
      }).end();
    }
    else {
      resp.json(data);
    }
  }

  /**
   * Returns a promise resolving the provided promise or value.
   * 
   * @protected
   * @param {*} result The value to resolve.
   * @returns {Promise<any>}
   */
  protected resolvePromise(result: any): Promise<any> {
    if (result && typeof result.then === 'function') {
      return result;
    }
    else {
      return Promise.resolve(result);
    }
  }

  /**
   * Returns a middleware calling the provided action or the action defined in the route
   * using the :action param.
   * 
   * @param {Action} [action] The Action to call.
   */
  public action(action?: Action) {
    return (req: http.IncomingMessage, res: http.ServerResponse, next: (err: any) => any): any => {
      const a = action || req.params['action'];
      this.callAction(a, req, res, next, !!action);
    };
  }

  /**
   * Tries to resolve a controller action by the given name or function.
   * If function does not exists or is marked as private, undefined is returned.
   * 
   * @private
   * @param {Action} action The action to resolve.
   */
  protected resolveActionFn(action: Action): ActionFn | undefined {
    let actionFn: ActionFn | undefined = undefined;
    if (typeof action === 'string') {
      if (typeof this.constructor.prototype[action] === 'function') {
        actionFn = this.constructor.prototype[action];
      }
    }
    else {
      actionFn = action;
    }

    if (actionFn && publicAction.getValue(this.constructor.prototype, actionFn.name)) {
      return actionFn;
    }
  }
}
