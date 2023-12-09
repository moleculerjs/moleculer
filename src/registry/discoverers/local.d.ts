import type Registry = require("../registry");
import type BaseDiscoverer = require("./base");
import type Node = require("../node");

declare namespace LocalDiscoverer {
	export interface LocalDiscovererOptions extends BaseDiscoverer.DiscovererOptions {}
}

declare class LocalDiscoverer extends BaseDiscoverer {
	constructor(opts?: LocalDiscoverer.LocalDiscovererOptions);
	init(registry: Registry): void;
	discoverNode(nodeID: string): Promise<Node | void>;
	discoverAllNodes(): Promise<Node[] | void>;
	sendLocalNodeInfo(nodeID?: string): Promise<void>;
}
export = LocalDiscoverer;
