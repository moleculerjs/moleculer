import type Context = require("../context");
import type ServiceBroker = require("../service-broker");
import type Registry = require("../registry/registry");
import type Endpoint = require("../registry/endpoint");

declare abstract class BaseStrategy {
	constructor(registry: Registry, broker: ServiceBroker, opts?: object);

	select(list: any[], ctx?: Context): Endpoint;
}
export = BaseStrategy;
