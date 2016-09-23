import * as express from 'express';
import CtrlError from './util/CtrlError';
import privateAction from './util/privateAction';
import { Action, ActionFn } from './util/types';
import DependencyInjector from './util/DependencyInjector';
import validate, { getValidator } from './validation/validate';

export default class BaseController {

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
  public callAction(
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

    const validationResult = getValidator(this.constructor, actionFn.name).validate(req);
    if (!validationResult.isValid) {
      return next(CtrlError.validation(validationResult));
    }

    const injector = new DependencyInjector(req, next);
    try {
      const result = actionFn.apply(this, injector.getParams(actionFn));
      if (typeof result.then === 'function') {
        result.then((r: any) => {
          this.writeResult(res, r);
        }, (err: any) => {
          next(err);
        });
      }
      else {
        this.writeResult(res, result);
      }
    }
    catch (err) {
      return next(err);
    }
  }

  @privateAction
  protected writeResult(res: express.Response, data: any) {
    res.json(data).end();
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
      const actionDescr = Object.getOwnPropertyDescriptor(this.constructor.prototype, action);
      if (actionDescr && typeof actionDescr.value === 'function') {
        actionFn = actionDescr.value;
      }
    }
    else {
      actionFn = action;
    }

    if (actionFn && !privateAction.getValue(this.constructor, actionFn.name)) {
      return actionFn;
    }
  }
}
