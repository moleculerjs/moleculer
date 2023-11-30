import ServiceBroker = require("../service-broker");
import Registry = require("./registry");
import Node = require("./node");
import type { ActionSchema, ServiceEvent } from "../service";

declare abstract class Endpoint {
	broker: ServiceBroker;
	registry: Registry;

	id: string;
	node: Node;

	local: boolean;
	state: boolean;

	constructor(registry: Registry, broker: ServiceBroker, node: Node);
	destroy(): void;

	get isAvailable(): boolean;
	abstract update(param: ActionSchema | ServiceEvent): void;

}
export = Endpoint;
