import Node = require("./node");

import type { ActionSchema } from "../service";
import type { ServiceEvent } from "../service";

declare class ServiceItem {
	node: Node;
	name: string;
	fullName: string;
	version: string | number;
	settings: Record<string, any>;
	metadata: Record<string, any>;

	local: boolean;
	actions: Record<string, ActionSchema>;
	events: Record<string, ServiceEvent>;

	constructor(node: Node, service: Record<string, any>, local: boolean);

	equals(fullName: string, nodeID?: string): boolean;

	update(svc: Record<string, any>): void;

	addAction(action: ActionSchema): void;
    addEvent(event: ServiceEvent): void;
}
export = ServiceItem;
