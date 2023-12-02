import EventEmitter = require("events");
import { Socket } from "net";

declare class TcpWriter extends EventEmitter {
    constructor(transporter: any, opts: any);
    sockets: Map<any, any>;
    opts: any;
    transporter: any;
    Promise: any;
    logger: any;

	connect(nodeID: string): any;
    send(nodeID: string, type: number, data: Buffer): any;
    manageConnections(): void;
    addSocket(nodeID: string, socket: Socket, force: boolean): void;
    removeSocket(nodeID: string): void;
    close(): void;
}

export = TcpWriter;
