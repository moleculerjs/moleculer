/**
 * TCP packet parser
 */
declare class Parser extends Writable {
    constructor(options: Record<string, any>, maxPacketSize: number);
    maxPacketSize: any;
    buf: Buffer;

    _write(chunk: Buffer, encoding: string, cb: Function): void;
}
import Writable_1 = require("stream");
import Writable = Writable_1.Writable;

export = Parser;
