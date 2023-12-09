import type Registry = require("../registry");
import type BaseDiscoverer = require("./base");
import type Node = require("../node");

declare namespace Etcd3Discoverer {
	export interface Etcd3DiscovererOptions extends BaseDiscoverer.DiscovererOptions {
		etcd?: any;
		serializer?: string;
		fullCheck?: number | null;
	}
}

declare class Etcd3Discoverer extends BaseDiscoverer {
	opts: Etcd3Discoverer.Etcd3DiscovererOptions;
	idx: number;
	client: any;

	lastInfoSeq: number;
	lastBeatSeq: number;

	leaseBeat: any;
	leaseInfo: any;

	constructor(opts?: Etcd3Discoverer.Etcd3DiscovererOptions|string);
	init(registry: Registry): void;
	stop(): Promise<void>;
	registerMoleculerMetrics(): void;
	sendHeartbeat(): Promise<void>;
	collectOnlineNodes(): Promise<void>;
	discoverNode(nodeID: string): Promise<Node | void>;
	discoverAllNodes(): Promise<Node[] | void>;
	sendLocalNodeInfo(nodeID?: string): Promise<void>;
	localNodeDisconnected(): Promise<void>;
}
export = Etcd3Discoverer;
