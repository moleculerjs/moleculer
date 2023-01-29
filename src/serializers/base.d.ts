import type ServiceBroker from "../service-broker";

declare abstract class Serializer {
	constructor(opts?: any);

	init(broker: ServiceBroker): void;

	serialize(obj: Record<string, any>, type: string): Buffer;

	deserialize(buf: Buffer, type: string): Record<string, any>;
}
export default Serializer;
