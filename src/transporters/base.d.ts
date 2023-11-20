import type Transit = require("../transit");
import type { Packet } from "../packets";

declare abstract class BaseTransporter {
	hasBuiltInBalancer: boolean;
	connected: boolean;
	opts: Record<string, any>;

	constructor(opts?: Record<string, any>);

	init(
		transit: Transit,
		messageHandler: (cmd: string, msg: string) => void,
		afterConnect: (wasReconnect: boolean) => void
	): void;

	connect(): Promise<any>;

	disconnect(): Promise<any>;

	onConnected(wasReconnect?: boolean): Promise<any>;

	makeSubscriptions(topics: Array<Record<string, any>>): Promise<void>;

	subscribe(cmd: string, nodeID?: string): Promise<void>;

	subscribeBalancedRequest(action: string): Promise<void>;

	subscribeBalancedEvent(event: string, group: string): Promise<void>;

	unsubscribeFromBalancedCommands(): Promise<void>;

	incomingMessage(cmd: string, msg: Buffer): Promise<void>;

	receive(cmd: string, data: Buffer): Promise<void>;

	prepublish(packet: Packet): Promise<void>;

	publish(packet: Packet): Promise<void>;

	publishBalancedEvent(packet: Packet, group: string): Promise<void>;

	publishBalancedRequest(packet: Packet): Promise<void>;

	send(topic: string, data: Buffer, meta: Record<string, any>): Promise<void>;

	getTopicName(cmd: string, nodeID?: string): string;

	makeBalancedSubscriptions(): Promise<void>;

	serialize(packet: Packet): Buffer;

	deserialize(type: string, data: Buffer): Packet;
}
export = BaseTransporter;
