import Registry = require("../registry");
import BaseDiscoverer = require("./base");


declare namespace LocalDiscoverer {
	export interface LocalDiscovererOptions extends BaseDiscoverer.DiscovererOptions {}
}

declare class LocalDiscoverer extends BaseDiscoverer {
	opts: LocalDiscoverer.LocalDiscovererOptions;

	constructor(opts?: LocalDiscoverer.LocalDiscovererOptions);
	init(registry: Registry): void;
	discoverNode(nodeID: string): Promise<void>;
	discoverAllNodes(): Promise<void>;
	sendLocalNodeInfo(nodeID?: string): Promise<void | void[]>;
}
export = LocalDiscoverer;
