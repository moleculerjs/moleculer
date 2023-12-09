import BaseTransporter = require("./base");

declare namespace Amqp10Transporter {
	export interface Amqp10TransporterOptions {
		url?: string | string[];
		prefetch?: number;
		eventTimeToLive?: number;
		heartbeatTimeToLive?: number;
		queueOptions?: Record<string, any>;
		topicOptions?: Record<string, any>;
		messageOptions?: Record<string, any>;
		autoDeleteQueues?: boolean | number;
	}
}

declare class Amqp10Transporter extends BaseTransporter {
	opts: Amqp10Transporter.Amqp10TransporterOptions;

	hasBuiltInBalancer: boolean;
	connection: any;
	channel: any;
	bindings: any[];

	channelDisconnecting: boolean;
	connectionDisconnecting: boolean;
	connectionCount: number;

	constructor(opts?: string | Amqp10Transporter.Amqp10TransporterOptions);

	connect(): Promise<void>;
	disconnect(): Promise<void>;

	_getQueueOptions(packetType: string): Record<string, any>;
	_getMessageOptions(packetType: string): Record<string, any>;
	_consumeCB(cmd: string, needAck?: boolean): (msg: any) => Promise<void>;

	subscribe(cmd: string, nodeID?: string): Promise<void>;
	subscribeBalancedRequest(action: string): Promise<void>;
	subscribeBalancedEvent(event: string, group: string): Promise<void>;

	send(topic: string, data: Buffer, meta: Record<string, any>): Promise<void>;
}

export = Amqp10Transporter;
