import ServiceBroker = require("../service-broker");
import Registry = require("./registry");
import Node = require("./node");

import Endpoint = require("./endpoint");
import type Service = require("../service");
import type { ServiceEvent } from "../service";

declare class EventEndpoint extends Endpoint {
	service: Service;
	event: ServiceEvent;

	constructor(registry: Registry, broker: ServiceBroker, node: Node, service: Service, event: ServiceEvent);

	update(event: ServiceEvent): void;
}
export = EventEndpoint;
