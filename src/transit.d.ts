import BaseTransporter = require("./transporters/base");
import Context = require("./context");
import Node = require("./registry/node");
import type { Packet } from "./packets";
import type { Logger } from "./logger-factory";
import ServiceBroker = require("./service-broker");
import Transporter = require("./transporters/base");

declare namespace Transit {
	export interface TransitRequest {
		action: string;
		nodeID: string;
		ctx: Context;
		resolve: (value: any) => void;
		reject: (reason: any) => void;
		stream: boolean;
	}
}

declare class Transit {
	broker: ServiceBroker;
	tx: BaseTransporter;
	promise: PromiseConstructor;
	logger: Logger;
	nodeID: string;
	instanceID: string;
	opts: any;
	pendingRequests: Map<string, Transit.TransitRequest>;
	pendingReqStreams: Map<string, any>;
	pendingResStreams: Map<string, any>;
	connected: boolean;
	disconnecting: boolean;
	isReady: boolean;

	constructor(broker: ServiceBroker, transporter: Transporter, opts: any | null);

	afterConnect(wasReconnect: boolean): Promise<void>;
	connect(): Promise<void>;
	disconnect(): Promise<any>;
	ready(): void;
	sendDisconnectPacket(): Promise<void>;
	makeSubscriptions(): Promise<void[]>;
	messageHandler(cmd: string, msg: Record<string, any>): boolean | Promise<void> | undefined;
	request(ctx: Context): Promise<void>;
	sendEvent(ctx: Context): Promise<void>;
	removePendingRequest(id: string): void;
	removePendingRequestByNodeID(nodeID: string): void;
	sendResponse(nodeID: string, id: string, data: Record<string, any>, err: Error): Promise<void>;
	sendResponse(nodeID: string, id: string, data: Record<string, any>): Promise<void>;
	discoverNodes(): Promise<void>;
	discoverNode(nodeID: string): Promise<void>;
	sendNodeInfo(info: Node, nodeID?: string): Promise<void | void[]>;
	sendPing(nodeID?: string, id?: string): Promise<void>;
	sendPong(payload: Record<string, any>): Promise<void>;
	processPong(payload: Record<string, any>): void;
	sendHeartbeat(localNode: Node): Promise<void>;
	subscribe(topic: string, nodeID: string): Promise<void>;
	publish(packet: Packet): Promise<void>;
}
export = Transit;
