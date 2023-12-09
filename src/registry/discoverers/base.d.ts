import type ServiceBroker = require("../../service-broker");
import type Transit = require("../../transit");
import type Registry = require("../registry");
import type Node = require("../node");
import type { Logger } from "../../logger-factory";

declare namespace BaseDiscoverer {
	export interface DiscovererOptions extends Record<string, any> {
		heartbeatInterval?: number;
		heartbeatTimeout?: number;

		disableHeartbeatChecks?: boolean;
		disableOfflineNodeRemoving?: boolean;
		cleanOfflineNodesTimeout?: number;
	}

	export interface RegistryDiscovererOptions {
		type: string;
		options: DiscovererOptions;
	}
}

declare abstract class BaseDiscoverer {
	broker: ServiceBroker;
	registry: Registry;
	Promise: PromiseConstructor;
	transit?: Transit;
	logger: Logger;

	localNode?: Node;

	heartbeatTimer: NodeJS.Timeout;
	checkNodesTimer: NodeJS.Timeout;
	offlineTimer: NodeJS.Timeout;

	constructor(opts?: BaseDiscoverer.DiscovererOptions);

	init(registry: Registry): void;

	stop(): Promise<void>;

	registerMoleculerMetrics(): void;

	startHeartbeatTimers(): void;

	stopHeartbeatTimers(): void;

	disableHeartbeat(): void;

	beat(): Promise<void>;

	checkRemoteNodes(): void;

	checkOfflineNodes(): void;

	heartbeatReceived(nodeID: string, payload: Record<string, any>): void;

	processRemoteNodeInfo(nodeID: string, payload: Record<string, any>): Node;

	sendHeartbeat(): Promise<void>;

	abstract discoverNode(nodeID: string): Promise<Node | void>;

	abstract discoverAllNodes(): Promise<Node[] | void>;

	abstract sendLocalNodeInfo(nodeID?: string): Promise<void>;

	localNodeDisconnected(): Promise<void>;

	remoteNodeDisconnected(nodeID: string, isUnexpected: boolean): void;
}
export = BaseDiscoverer;
