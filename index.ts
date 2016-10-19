import * as http from 'http';
import CtrlError from './util/CtrlError';
import response from './util/response';

export function errorHandler() {
  return (err: any, req: http.IncomingMessage, res: http.ServerResponse, next: Function) => {
    response(res).error(err);
  };
}