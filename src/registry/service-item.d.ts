import Node = require("./node");

declare class ServiceItem {
	constructor(node: Node, service: Record<string, any>, local: boolean);
}
export = ServiceItem;
