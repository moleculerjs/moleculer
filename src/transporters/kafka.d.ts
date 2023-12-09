import BaseTransporter = require("./base");

declare namespace KafkaTransporter {
	export interface KafkaTransporterOptions {
		brokers?: string | string[];
		client?: Record<string, any>;
		producer?: Record<string, any>;
		consumer?: Record<string, any>;
		publish?: Record<string, any>;
		publishMessage?: Record<string, any>;
	}
}

declare class KafkaTransporter extends BaseTransporter {
	opts: KafkaTransporter.KafkaTransporterOptions;

	client: any;
	producer: any;
	consumer: any;
	admin: any;

	constructor(opts?: string | KafkaTransporter.KafkaTransporterOptions);

	connect(): Promise<void>;
	disconnect(): Promise<void>;

	makeSubscriptions(topics: Array<Record<string, any>>): Promise<void>;

	subscribe(cmd: string, nodeID?: string): Promise<void>;
	subscribeBalancedRequest(action: string): Promise<void>;
	subscribeBalancedEvent(event: string, group: string): Promise<void>;

	send(topic: string, data: Buffer, meta: Record<string, any>): Promise<void>;
}
export = KafkaTransporter;
