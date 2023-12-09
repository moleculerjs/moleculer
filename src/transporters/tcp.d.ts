import BaseTransporter = require("./base");
import type Transit = require("../transit");
import type { Packet } from "../packets";
import type Registry = require("../registry/registry");
import type Node = require("../registry/node");
import type BaseDiscoverer = require("../registry/discoverers/base");
import type NodeCatalog = require("../registry/node-catalog");
import type { Socket } from "net";

declare namespace TcpTransporter {
	export interface TcpTransporterOptions {
		// UDP discovery options
		udpDiscovery?: boolean;
		udpPort?: number;
		udpBindAddress?: string;
		udpPeriod?: number;
		udpReuseAddr?: boolean;
		udpMaxDiscovery?: number;

		// Multicast settings
		udpMulticast?: string;
		udpMulticastTTL?: number;

		// Broadcast settings
		udpBroadcast?: boolean;

		// TCP options
		port?: number;
		urls?: string;
		useHostname?: boolean;

		gossipPeriod?: number;
		maxConnections?: number;
		maxPacketSize?: number;
	}
}

declare class TcpTransporter extends BaseTransporter {
	opts: TcpTransporter.TcpTransporterOptions;

	Promise: typeof Promise;
	registry: Registry;
	discoverer: BaseDiscoverer;
	nodes: NodeCatalog;

	constructor(opts?: string | TcpTransporter.TcpTransporterOptions);

	init(
		transit: Transit,
		messageHandler: (cmd: string, msg: string) => void,
		afterConnect: (wasReconnect: boolean) => void
	): void;
	connect(): Promise<void>;
	disconnect(): Promise<void>;

	startTcpServer(): Promise<void>;
	startUdpServer(): Promise<void>;
	loadUrls(): Promise<void>;

	onIncomingMessage(type: string, message: Buffer, socket: Socket): void | Promise<void>;
	receive(type: string, message: Buffer, socket: Socket): void | Promise<void>;
	startTimers(): void;
	stopTimers(): void;
	addOfflineNode(id: string, address: string, port: number): Node;
	getNode(nodeID: string): Node;
	getNodeAddress(node: Node): string;
	sendHello(nodeID: string): Promise<void>;
	processGossipHello(msg: Buffer, socket: Socket): void;
	sendGossipRequest(): void;
	sendGossipToRandomEndpoint(data: Record<string, any>, endpoints: Node[]): void;
	processGossipRequest(msg: Buffer): void;
	processGossipResponse(msg: Buffer): void;

	getLocalNodeInfo(): Node;
	getNodeInfo(nodeID: string): Node;

	subscribe(cmd: string, nodeID?: string): Promise<void>;
	subscribeBalancedRequest(action: string): Promise<void>;
	subscribeBalancedEvent(event: string, group: string): Promise<void>;
	unsubscribeFromBalancedCommands(): Promise<void>;

	publish(packet: Packet): any;
	send(topic: string, data: Buffer, meta: Record<string, any>): Promise<void>;
}
export = TcpTransporter;
