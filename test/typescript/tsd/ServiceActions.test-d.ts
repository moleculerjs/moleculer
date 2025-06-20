import { expectType } from "tsd";
import {
	Service,
	ServiceBroker,
	ServiceAction,
	ServiceActions,
	ServiceSettingSchema,
} from "../../../index";

const broker = new ServiceBroker({ logger: false, transporter: "Fake" });

class TestService extends Service {
	constructor(broker: ServiceBroker) {
		super(broker);

		this.parseServiceSchema({
			name: "test1",
			actions: {
				foo: {
					async handler() {
						expectType<Service<ServiceSettingSchema> & Record<string, any>>(this);
						expectType<ServiceActions>(testService.actions);
					},
				},
				bar() {
					this.actions.foo(); // check `this` ref in `foo`, should not throw error;

					expectType<Service<ServiceSettingSchema> & Record<string, any>>(this);
					expectType<ServiceActions>(testService.actions);
				},
			},
		});
	}
}

const testService = new TestService(broker);

expectType<ServiceActions>(testService.actions);
expectType<ServiceAction>(testService.actions.foo);
expectType<ServiceAction>(testService.actions.bar);
