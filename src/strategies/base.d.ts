import type Context = require("../context");
import type ServiceBroker = require("../service-broker");
import type Registry = require("../registry/registry");
import type Endpoint = require("../registry/endpoint");

declare abstract class BaseStrategy {
	constructor(registry: Registry, broker: ServiceBroker, opts?: object);

	registry: Registry;
    broker: ServiceBroker;
	// opts: Record<string, any>;

	abstract select(list: Endpoint[], ctx?: Context): Endpoint;
}
export = BaseStrategy;
