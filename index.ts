import * as http from 'http';
import CtrlError from './util/CtrlError';
import response from './util/response';

export function errorHandler() {
  return (err: any, req: http.IncomingMessage, res: http.ServerResponse, next: Function) => {
    const error = err instanceof CtrlError ? err : CtrlError.server().innerErr(err);
    response(res).json(error, error.status() || 500).end();
  };
}