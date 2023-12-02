import type { ConnectionOptions, Subscription } from "nats/lib/nats-base-client/core";
import BaseTransporter = require("./base");

declare namespace NatsTransporter {
	export interface NatsTransporterOptions extends ConnectionOptions {
		url?: string;
		preserveBuffers?: boolean;
		maxReconnectAttempts?: number;
	}
}

declare class NatsTransporter extends BaseTransporter {
	opts: NatsTransporter.NatsTransporterOptions;

	hasBuiltInBalancer: boolean;
	client: any;
	subscriptions: Subscription[];

	constructor(opts?: string | NatsTransporter.NatsTransporterOptions);

	connect(): Promise<void>;
	disconnect(): Promise<void>;

	subscribe(cmd: string, nodeID?: string): Promise<void>;
	subscribeBalancedRequest(action: string): Promise<void>;
	subscribeBalancedEvent(event: string, group: string): Promise<void>;
	unsubscribeFromBalancedCommands(): Promise<void>;

	send(topic: string, data: Buffer): Promise<void>;

}
export = NatsTransporter;
