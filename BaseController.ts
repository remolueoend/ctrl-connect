import * as express from 'express';
import CtrlError from './util/CtrlError';
import privateAction from './util/privateAction';
import { Action, ActionFn } from './util/types';
import DependencyInjector, {IDependencyInjectorType} from './util/DependencyInjector';
import validate, { getValidator } from './validation/validate';

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
   * @param {express.Request} $req
   * @param {express.Response} res
   * @param {ActionFn} action The action which will be called.
   * @returns {(Promise<undefined> | undefined)}
   * 
   * @memberOf BaseController
   */
  @privateAction
  protected beforeCall(req: express.Request, res: express.Response, action: ActionFn): Promise<undefined> | void {
    const validationResult = getValidator(this.constructor.prototype, action.name).validate(req);
    if (!validationResult.isValid) {
      throw CtrlError.validation(validationResult);
    }
  }

  /**
   * Gets called after an action was called and result was written to response. 
   * 
   * @protected
   * @param {express.Request} $req
   * @param {express.Response} res
   * @param {ActionFn} action The action which was called.
   * 
   * @memberOf BaseController
   */
  @privateAction
  protected afterCall(req: express.Request, res: express.Response, action: ActionFn): void {
  }

  /**
   * Tries to call the provided action and writes the result to the client response.
   * Any errors are redirected using next(err). 
   * 
   * @param {Action} action The action to call.
   * @param {express.Request} req Current client request.
   * @param {express.Response} res Current client response.
   * @param {express.NextFunction} next express next function.
   * @param {boolean} [throwIfNotFound=false] Set to true if a server error should be thrown
   * when action could not be found. Default behavior is calling next().
   */
  @privateAction
  protected callAction(
    action: Action, req: express.Request,
    res: express.Response,
    next: express.NextFunction,
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

    const injector = new this.injectoryType(req, res, next);
    try {
      this.resolvePromise(this.beforeCall(req, res, actionFn))
      .then(() => {
        const actionResult = actionFn.apply(this, injector.getParams(actionFn));
        return this.resolvePromise(actionResult);
      })
      .then(result =>
        this.writeResult(res, result))
      .catch(err =>
        next(err))
      .then(() =>
        this.afterCall(req, res, actionFn))
      .catch(err =>
        next(err));
    }
    catch (err) {
      return next(err);
    }
  }

  /**
   * Writes the provided data to the response.
   * 
   * @protected
   * @param {express.Response} res The current response object.
   * @param {*} data The data to write.
   */
  @privateAction
  protected writeResult(res: express.Response, data: any) {
    res.json(data).end();
  }

  /**
   * Returns a promise resolving the provided promise or value.
   * 
   * @protected
   * @param {*} result The value to resolve.
   * @returns {Promise<any>}
   */
  @privateAction
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
  @privateAction
  public action(action?: Action): express.RequestHandler {
    return (req: express.Request, res: express.Response, next: express.NextFunction): any => {
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
  @privateAction
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

    if (actionFn && !privateAction.getValue(this.constructor.prototype, actionFn.name)) {
      return actionFn;
    }
  }
}
