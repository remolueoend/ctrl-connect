import * as http from 'http';
import Validator from './validation/Validator';

export default class RequestContext {
  public readonly validator: Validator;

  constructor(public readonly req: http.IncomingMessage) {
    this.validator = new Validator();
  }
}