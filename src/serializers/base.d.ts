import type ServiceBroker = require("../service-broker");

declare abstract class Serializer {
	constructor(opts?: Record<string, any>);

	broker: ServiceBroker;

	init(broker: ServiceBroker): void;

	abstract serialize(obj: Record<string, any>, type?: string): Buffer;

	abstract deserialize(buf: Buffer | string, type?: string): any;

	serializeCustomFields(type: string, obj: Record<string, any>): Record<string, any>;
	deserializeCustomFields(type: string, obj: Record<string, any>): Record<string, any>;

	convertDataToTransport(obj: Record<string, any>, field: string, fieldType: string): void;
	convertDataFromTransport(obj: Record<string, any>, field: string, fieldType: string): void;
}
export = Serializer;
