import ServiceBroker = require("../service-broker");
import Registry = require("./registry");
import Node = require("./node");

declare namespace NodeCatalog {
	export interface NodeCatalogListOptions {
		onlyAvailable?: boolean;
		withServices?: boolean;
	}

	export type NodeCatalogListResult = Omit<Node, "rawInfo">;
}

declare class NodeCatalog {
	registry: Registry;
    broker: ServiceBroker;
	nodes: Map<string, any>;
	localNode?: Node;

	constructor(registry: Registry, broker: ServiceBroker);

	createLocalNode(): Node;
	add(id: string, node: Node): void;
	has(id: string): boolean;
	get(id: string): Node;
    delete(id: string): boolean;
    count(): number;
    onlineCount(): number;
    processNodeInfo(payload: any): Node;
    disconnected(nodeID: string, isUnexpected: boolean): void;
    list(opts: NodeCatalog.NodeCatalogListOptions): NodeCatalog.NodeCatalogListResult[];
    toArray(): Node[];
}

export = NodeCatalog;
