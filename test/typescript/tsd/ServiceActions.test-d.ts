import { expectType } from "tsd";
import { Service, ServiceBroker, ServiceAction, ServiceActions } from "../../../index";

const broker = new ServiceBroker({ logger: false, transporter: "fake" });

class TestService extends Service {
	constructor(broker: ServiceBroker) {
		super(broker);

		this.parseServiceSchema({
			name: "test1",
			actions: {
				foo: {
					async handler() { }
				},
				bar() { }
			}
		});
	}
}

const testService = new TestService(broker);

expectType<ServiceActions>(testService.actions);
expectType<ServiceAction>(testService.actions.foo);
expectType<ServiceAction>(testService.actions.bar);

