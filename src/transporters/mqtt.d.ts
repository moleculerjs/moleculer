import BaseTransporter = require("./base");

declare namespace MqttTransporter {
	export interface MqttTransporterOptions {
		qos?: number;
		topicSeparator?: string;
	}
}

declare class MqttTransporter extends BaseTransporter {
	opts: MqttTransporter.MqttTransporterOptions;

	qos: number;
	topicSeparator: string;
	client: any;

	constructor(opts?: MqttTransporter.MqttTransporterOptions);

	connect(): Promise<void>;
	disconnect(): Promise<void>;

	getTopicName(cmd: string, nodeID?: string): string;

	subscribe(cmd: string, nodeID?: string): Promise<void>;
	subscribeBalancedRequest(action: string): Promise<void>;
	subscribeBalancedEvent(event: string, group: string): Promise<void>;

	send(topic: string, data: Buffer): Promise<void>;
}
export = MqttTransporter;
