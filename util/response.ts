import * as http from 'http';
import CtrlError from './CtrlError';
import * as util from 'util';

export interface Next {
  (err?: any): any;
}

export interface IWriteOptons {
  headers?: { [index: string]: string; };
  data: any;
  status?: number;
}

export class ResponseHandler {

  /**
   * True if end() was called.
   * No writes are possible anymore as soon as the response is closed.
   * 
   * @protected
   * @type {boolean}
   * @memberOf ResponseHandler
   */
  protected closed: boolean;

  /**
   * Array of promises resolving after content is written to the stream.
   * Internally used to end() stream after already started write jobs are finished.
   * 
   * @protected
   * @type {Promise<any>[]}
   * @memberOf ResponseHandler
   */
  protected writePromises: Promise<any>[];

  /**
   * Creates an instance of ResponseHandler.
   * 
   * @param {http.ServerResponse} res
   * @param {Next} [next]
   * 
   * @memberOf ResponseHandler
   */
  constructor(protected res: http.ServerResponse, protected next?: Next) {
    this.closed = false;
    this.writePromises = [];
    this.res.on('error', this.handleWriteError.bind(this));
  }

  /**
   * Handles an error which was raised during writing to the response stream. This is a little bit delicate,
   * because raising an error while writing an error to the response may lead to an endless loop.
   * 
   * @protected
   * @param {Error} err
   * 
   * @memberOf ResponseHandler
   */
  protected handleWriteError(err: Error) {
    console.error(`Error while generating client response at '${__filename}': ${util.inspect(err)}`);
  }

  /**
   * Writes data to the server response. If writing or data conversion fails, an error will be sent to the
   * app server's std error instead.
   * 
   * @param {IWriteOptons} options
   * @returns
   * 
   * @memberOf ResponseHandler
   */
  public write(options: IWriteOptons) {
    if (this.closed === true) {
      this.handleWriteError(CtrlError.server('Cannot write to response. Stream is already closed.'));
      return this;
    }

    this.res.statusCode = options.status || 200;
    if (options.headers) {
      for (let h of Object.getOwnPropertyNames(options.headers)) {
        this.res.setHeader(h, options.headers[h]);
      }
    }

    try {
      const dataChunk =
        options.data instanceof Buffer || options.data instanceof ArrayBuffer || ArrayBuffer.isView(options.data) ?
          Buffer.from(<any>options.data) : JSON.stringify(options.data);
      this.writeToStream(dataChunk);
    }
    catch (err) {
      this.handleWriteError(CtrlError.server('Error while generating server response.').innerErr(err));
    }

    return this;
  }

  /**
   * Writes data to the response stream.
   * 
   * @protected
   * @param {(string | Buffer)} data
   * 
   * @memberOf ResponseHandler
   */
  protected writeToStream(data: string | Buffer) {
    this.writePromises.push(new Promise((resolve, reject) => {
      try {
        this.res.write(<any>data, () => resolve());
      }
      catch (err) {
        this.handleWriteError(err);
        resolve();
      }
    }));
  }

  /**
   * Writes the JSON-encoded string of the provided data to the response. A response header
   * 'Content-Type: application/json' is set. 
   * Closes the response stream after writing.
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
    }).end();
  }

  /**
   * Sends a binary based DICOM file to the client.
   * Closes the response stream after writing.
   * 
   * @param {Uint8Array} content The content of the file as Uint8Array.
   * 
   * @memberOf ResponseHandler
   */
  public dicomFile(content: Uint8Array) {
    return this.write({
      data: content,
      headers: { 'Content-Type': 'application/dicom' }
    }).end();
  }

  /**
   * Writes a radia error to the response. If anything else than a CtrlError instance is provided,
   * the err parameter gets wrapped into a CtrlError server error (500).
   * Closes the response stream after writing.
   * 
   * @param {*} err
   * 
   * @memberOf ResponseHandler
   */
  public error(err: any) {
    const error = err instanceof CtrlError ? err : CtrlError.server().innerErr(err);
    this.json(error, error.status() || 500);
  }

  /**
   * Closes the response stream. No more data can be written to the client.
   * The connextion gets closed as soon as all started writing jobs are finished.
   * 
   * @memberOf ResponseHandler
   */
  public end() {
    this.closed = true;
    return Promise.all(this.writePromises).then(() => this.res.end());
  }
}

export default function response(res: http.ServerResponse, next?: Next) {
  return new ResponseHandler(res, next);
}