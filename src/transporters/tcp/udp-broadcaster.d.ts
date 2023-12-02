import EventEmitter = require("events");

declare class UdpServer extends EventEmitter {
    constructor(transporter: any, opts: any);

	servers: any[];
    discoverTimer: NodeJS.Timeout;
    opts: any;
    transporter: any;
    logger: any;
    nodeID: any;
    namespace: any;
    Promise: any;
    counter: number;

	bind(): Promise<any>;
    startServer(host: string | null, port: number | null, multicastAddress: string | null, ttl: number | null): any;
    discover(): void;
    onMessage(data: Buffer, rinfo: Record<string, any>): void;
    startDiscovering(): void;
    stopDiscovering(): void;
    close(): void;
    getBroadcastAddresses(): Array<string>;
    getInterfaceAddresses(): Array<string>;
}

export = UdpServer;
