import type Context from "../context";
import type ServiceBroker from "../service-broker";
import type Registry from "../registry";
import type { Endpoint } from "../registry";

declare abstract class BaseStrategy {
	constructor(registry: Registry, broker: ServiceBroker, opts?: object);

	select(list: any[], ctx?: Context): Endpoint;
}
export default BaseStrategy;
