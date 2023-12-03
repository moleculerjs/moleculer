import type Transit = require("../transit");
import type { Packet } from "../packets";
import ServiceBroker = require("../service-broker");
import { Logger } from "../logger-factory";
import type { Socket } from "net";

declare abstract class BaseTransporter {
	opts: Record<string, any>;
	connected: boolean;
	hasBuiltInBalancer: boolean;
	transit: Transit;
	broker: ServiceBroker;
	logger: Logger;

	nodeID: string;
	prefix: string;

	constructor(opts?: Record<string, any>);

	init(
		transit: Transit,
		messageHandler: (cmd: string, msg: string) => void,
		afterConnect: (wasReconnect: boolean) => void
	): void;

	abstract connect(errorHandler: Function): Promise<any>;

	abstract disconnect(): Promise<any>;

	onConnected(wasReconnect?: boolean): Promise<any>;

	makeSubscriptions(topics: Array<Record<string, any>>): Promise<void>;
	makeBalancedSubscriptions(): Promise<void>;

	incomingMessage(cmd: string, msg?: Buffer): Promise<void>;
	receive(cmd: string, data: Buffer, socket?: Socket): Promise<void> | void;

	abstract subscribe(cmd: string, nodeID?: string): Promise<void>;
	abstract subscribeBalancedRequest(action: string): Promise<void>;
	abstract subscribeBalancedEvent(event: string, group: string): Promise<void>;
	unsubscribeFromBalancedCommands(): Promise<void>;

	prepublish(packet: Packet): Promise<void>;
	publish(packet: Packet): Promise<void>;
	publishBalancedEvent(packet: Packet, group: string): Promise<void>;
	publishBalancedRequest(packet: Packet): Promise<void>;
	abstract send(topic: string, data: Buffer, meta: Record<string, any>): Promise<void>;

	getTopicName(cmd: string, nodeID?: string): string;

	serialize(packet: Packet): Buffer;
	deserialize(type: string, buf: Buffer): Packet;
}

export = BaseTransporter;
