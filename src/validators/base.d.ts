import type ServiceBroker from "../service-broker";

export type ValidatorNames = "Fastest";

declare abstract class Base {
	constructor();

	init(broker: ServiceBroker): void;

	compile(schema: Record<string, any>): Function;

	validate(params: Record<string, any>, schema: Record<string, any>): boolean;

	middleware(): (handler: ActionHandler, action: ActionSchema) => any;

	convertSchemaToMoleculer(schema: any): Record<string, any>;
}
export default Base;
