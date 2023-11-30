import ServiceBroker = require("../service-broker");
import Registry = require("./registry");
import Node = require("./node");

import Endpoint = require("./endpoint");
import type Service = require("../service");
import type { ActionSchema } from "../service";

declare class ActionEndpoint extends Endpoint {
	service: Service;
	action: ActionSchema;

	constructor(registry: Registry, broker: ServiceBroker, node: Node, service: Service, action: any);

	update(action: ActionSchema): void;
}
export = ActionEndpoint;
