import * as http from 'http';
import CtrlError from './CtrlError';

export interface Next {
  (err?: any): any;
}

export interface IWriteOptons {
  headers?: { [index: string]: string; };
  data: any;
  status?: number;
}

export class ResponseHandler {
  constructor(protected res: http.ServerResponse, protected next?: Next) { }

  /**
   * Writes data to the server response. If an error is raised and no next-handler provided,
   * a standard error message will be sent to the client to avoid any circular error handling loops.
   * 
   * @param {IWriteOptons} options
   * @returns
   * 
   * @memberOf ResponseHandler
   */
  public write(options: IWriteOptons) {
    this.res.statusCode = options.status || 200;
    if (options.headers) {
      for (let h of Object.getOwnPropertyNames(options.headers)) {
        this.res.setHeader(h, options.headers[h]);
      }
    }

    try {
      const dataChunk = options.data instanceof Buffer ?
        options.data : JSON.stringify(options.data);
      this.res.write(dataChunk);
    }
    catch (err) {
      if (typeof this.next === 'function') {
        this.next(CtrlError.server('Error while generating server response.').innerErr(err));
      }
      else {
        this.res.statusCode = 500;
        this.res.write(`Error while generating client response at '${__filename}': ${err.message || err}`);
      }
    }

    return this;
  }

  /**
   * Writes the JSON-encoded string of the provided data to the response. A response header
   * 'Content-Type: application/json' is set. 
   * 
   * @param {*} data
   * @param {number} [status]
   * @returns
   * 
   * @memberOf ResponseHandler
   */
  public json(data: any, status?: number) {
    return this.write({
      data, headers: { 'Content-Type': 'application/json' }, status
    });
  }

  /**
   * Writes a radia error to the response. If anything else than a CtrlError instance is provided,
   * the err parameter gets wrapped into a CtrlError server error (500).
   * 
   * @param {*} err
   * 
   * @memberOf ResponseHandler
   */
  public error(err: any) {
    const error = err instanceof CtrlError ? err : CtrlError.server().innerErr(err);
    this.json(error, error.status() || 500).end();
  }

  /**
   * Closes the response stream. No more data can be written to the client.
   * 
   * 
   * @memberOf ResponseHandler
   */
  public end() {
    this.res.end();
  }
}

export default function response(res: http.ServerResponse, next?: Next) {
  return new ResponseHandler(res, next);
}