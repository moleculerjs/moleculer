import { EventEmitter } from "stream";
import BaseTransporter = require("./base");

declare class FakeTransporter extends BaseTransporter {
	bus: EventEmitter;
	hasBuiltInBalancer: boolean;
	subscriptions: Array<{ topic: string, handler: Function }>;

	constructor(opts?: string|Record<string, any>);

	connect(): Promise<void>;
	disconnect(): Promise<void>;

	subscribe(cmd: string, nodeID?: string): Promise<void>;
	subscribeBalancedRequest(action: string): Promise<void>;
	subscribeBalancedEvent(event: string, group: string): Promise<void>;

	send(topic: string, data: Buffer): Promise<void>;
}
export = FakeTransporter;
