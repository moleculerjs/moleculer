import ServiceBroker = require("../service-broker");
import Registry = require("./registry");
import Node = require("./node");

import Endpoint = require("./endpoint");
import type Service = require("../service");
import type { EventSchema } from "../service";

declare class EventEndpoint extends Endpoint {
	service: Service;
	event: EventSchema;

	constructor(registry: Registry, broker: ServiceBroker, node: Node, service: Service, event: EventSchema);

	update(event: EventSchema): void;
}
export = EventEndpoint;
