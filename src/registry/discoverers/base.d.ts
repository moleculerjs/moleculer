import Transit = require("../../transit");
import Registry = require("../registry");
import Node = require("../node");

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
	constructor(opts?: BaseDiscoverer.DiscovererOptions);

	transit?: Transit;

	localNode?: Node;

	heartbeatTimer: NodeJS.Timeout;

	checkNodesTimer: NodeJS.Timeout;

	offlineTimer: NodeJS.Timeout;

	init(registry: Registry): void;

	stop(): Promise<void>;

	startHeartbeatTimers(): void;

	stopHeartbeatTimers(): void;

	disableHeartbeat(): void;

	beat(): Promise<void>;

	checkRemoteNodes(): void;

	checkOfflineNodes(): void;

	heartbeatReceived(nodeID: string, payload: Record<string, any>): void;

	processRemoteNodeInfo(nodeID: string, payload: Record<string, any>): Node;

	sendHeartbeat(): Promise<void>;

	discoverNode(nodeID: string): Promise<Node | void>;

	discoverAllNodes(): Promise<Node[] | void>;

	localNodeReady(): Promise<void>;

	sendLocalNodeInfo(nodeID: string): Promise<void>;

	localNodeDisconnected(): Promise<void>;

	remoteNodeDisconnected(nodeID: string, isUnexpected: boolean): void;
}
export = BaseDiscoverer;
