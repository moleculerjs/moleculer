import EventEmitter = require("events");
import type { Server, Socket } from "net";

declare class TcpReader extends EventEmitter {
	constructor(transporter: any, opts: any);

	server: Server;
	opts: any;
	transporter: any;
	Promise: any;
	logger: any;
	sockets: any[];
	connected: boolean;

	listen(): Promise<any>;
	onTcpClientConnected(socket: Socket): void;
	closeSocket(socket: Socket): void;
	close(): void;
}

export = TcpReader;
