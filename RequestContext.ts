import * as http from 'http';
import Validator from './validation/Validator';
import * as R from 'ramda';

/**
 * Wraps the current request instance including request meta data. 
 * 
 * @export
 * @class RequestContext
 */
export default class RequestContext {

  /**
   * Validator assicoated with the current request. 
   * 
   * 
   * @memberOf RequestContext
   */
  public readonly validator: Validator;

  /**
   * Returns true if the client provided any request data.
   * 
   * @readonly
   * 
   * @memberOf RequestContext
   */
  get hasBody () {
    return !R.isNil(this.req.body) && !R.isEmpty(this.req.body);
  }

  /**
   * Returns true if request method is POST or PUT.
   * 
   * @readonly
   * 
   * @memberOf RequestContext
   */
  get isPostOrPut () {
    return this.req.method === 'post' || this.req.method === 'put';
  }

  constructor(public readonly req: http.IncomingMessage) {
    this.validator = new Validator();
  }
}