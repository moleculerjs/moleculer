import BaseStrategy = require("./base");

import type ServiceBroker = require("../service-broker");
import type Registry = require("../registry/registry");
import type Endpoint = require("../registry/endpoint");

declare class RandomStrategy extends BaseStrategy {
	constructor(registry: Registry, broker: ServiceBroker, opts?: object);

	select(list: Endpoint[]): Endpoint;
}
export = RandomStrategy;
