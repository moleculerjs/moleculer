import type Registry = require("../registry");
import type BaseDiscoverer = require("./base");
import type Node = require("../node");

declare namespace RedisDiscoverer {
	export interface RedisDiscovererOptions extends BaseDiscoverer.DiscovererOptions {
		redis?: any;
		serializer?: string;
		fullCheck?: number | null;
		scanLength?: number;
		monitor?: boolean;
	}
}

declare class RedisDiscoverer extends BaseDiscoverer {
	opts: RedisDiscoverer.RedisDiscovererOptions;
	idx: number;
	client: any;

	infoUpdateTimer: NodeJS.Timeout;

	lastInfoSeq: number;
	lastBeatSeq: number;

	reconnecting: boolean;

	constructor(opts?: string | RedisDiscoverer.RedisDiscovererOptions);
	init(registry: Registry): void;
	stop(): Promise<void>;
	registerMoleculerMetrics(): void;
	recreateInfoUpdateTimer(): void;
	sendHeartbeat(): Promise<void>;
	collectOnlineNodes(): Promise<void>;
	discoverNode(nodeID: string): Promise<Node | void>;
	discoverAllNodes(): Promise<Node[] | void>;
	sendLocalNodeInfo(nodeID?: string): Promise<void>;
	localNodeDisconnected(): Promise<void>;
	scanClean(match: string): Promise<void>;
}
export = RedisDiscoverer;
