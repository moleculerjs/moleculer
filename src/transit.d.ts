import BaseTransporter = require("./transporters/base");
import Context = require("./context");
import Node = require("./registry/node");
import type { Packet } from "./packets";
import type { Logger } from "./logger-factory";
import ServiceBroker = require("./service-broker");
import Transporter = require("./transporters/base");
import BaseDiscoverer = require("./registry/discoverers/base");
import MetricRegistry = require("./metrics/registry");
import type {
	Regenerator as ErrorRegenerator
} from "./errors";
import { Stream } from "stream";
import { NodeRawInfo } from "./registry";

declare namespace Transit {
	export interface TransitOptions {
		maxQueueSize?: number;
		disableReconnect?: boolean;
		disableVersionCheck?: boolean;
		maxChunkSize?: number;
	}

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
	Promise: PromiseConstructor;
	logger: Logger;
	nodeID: string;
	metrics: MetricRegistry;
	instanceID: string;
	tx: BaseTransporter;
	opts: Transit.TransitOptions;
	discoverer: BaseDiscoverer;
	errorRegenerator: ErrorRegenerator;

	pendingRequests: Map<string, Transit.TransitRequest>;
	pendingReqStreams: Map<string, any>;
	pendingResStreams: Map<string, any>;

	connected: boolean;
	disconnecting: boolean;
	isReady: boolean;

	constructor(broker: ServiceBroker, transporter: Transporter, opts: any | null);

	registerMoleculerMetrics(): void;

	afterConnect(wasReconnect: boolean): Promise<void>;
	connect(): Promise<void>;
	disconnect(): Promise<any>;
	ready(): void;

	sendDisconnectPacket(): Promise<void>;
	makeSubscriptions(): Promise<void[]>;

	messageHandler(cmd: string, packet: Packet): Promise<void>;
	eventHandler(payload: Record<string, any>): Promise<boolean>;
	requestHandler(payload: Record<string, any>): Promise<void>;

	_handleIncomingRequestStream(payload: Record<string, any>): boolean|Stream;
	_createErrFromPayload(error: Record<string, any>, payload: Record<string, any>): Error;
	responseHandler(packet: Record<string, any>): void;
	_handleIncomingResponseStream(packet: Record<string, any>, req: Record<string, any>): boolean;

	request(ctx: Context): Promise<void>;
	_sendRequest(ctx: Context, resolve: Function, reject: Function): Promise<void>;

	sendEvent(ctx: Context): Promise<void>;

	removePendingRequest(id: string): void;
	removePendingRequestByNodeID(nodeID: string): void;

	_createPayloadErrorField(error: Error, payload: Record<string, any>): Record<string, any>;

	sendResponse(nodeID: string, id: string, meta: Record<string, any>, headers: Record<string, any>, data: Record<string, any>, err?: Error): Promise<void>;

	discoverNodes(): Promise<void>;
	discoverNode(nodeID: string): Promise<void>;

	sendNodeInfo(info: NodeRawInfo, nodeID?: string): Promise<void | void[]>;

	sendPing(nodeID?: string, id?: string): Promise<void>;
	sendPong(payload: Record<string, any>): Promise<void>;
	processPong(payload: Record<string, any>): void;

	sendHeartbeat(localNode: Node): Promise<void>;
	publish(packet: Packet): Promise<void>;
}
export = Transit;
