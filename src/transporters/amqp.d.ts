import BaseTransporter = require("./base");

declare namespace AmqpTransporter {
	export interface AmqpTransporterOptions {
		url?: string | string[];
		prefetch?: number;
		eventTimeToLive?: number;
		heartbeatTimeToLive?: number;
		queueOptions?: Record<string, any>;
		exchangeOptions?: Record<string, any>;
		messageOptions?: Record<string, any>;
		consumeOptions?: Record<string, any>;
		autoDeleteQueues?: boolean|number;
	}
}

declare class AmqpTransporter extends BaseTransporter {
	opts: AmqpTransporter.AmqpTransporterOptions

	hasBuiltInBalancer: boolean;
	connection: any;
	channel: any;
	bindings: any[];

	channelDisconnecting: boolean;
	connectionDisconnecting: boolean;
	connectionCount: number;

	constructor(opts?: string|AmqpTransporter.AmqpTransporterOptions);

	connect(): Promise<void>;
	disconnect(): Promise<void>;

	_getQueueOptions(packetType: string, balancedQueue?: boolean): Record<string, any>;
	_consumeCB(cmd: string, needAck?: boolean): (msg: any) => Promise<void>;

	subscribe(cmd: string, nodeID?: string): Promise<void>;
	subscribeBalancedRequest(action: string): Promise<void>;
	subscribeBalancedEvent(event: string, group: string): Promise<void>;

	send(topic: string, data: Buffer, meta: Record<string, any>): Promise<void>;
}

export = AmqpTransporter;
