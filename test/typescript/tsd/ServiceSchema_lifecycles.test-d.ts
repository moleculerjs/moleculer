import { expectType } from "tsd";
import { Service, ServiceBroker, ServiceSchema } from "../../../index";

const broker = new ServiceBroker({ logger: false, transporter: "fake" });

class TestService1 extends Service {
	constructor(broker: ServiceBroker) {
		super(broker);

		this.parseServiceSchema({
			name: "test1",
			created() {},
			async started() {},
			async stopped() {}
		});
	}
}

class TestService2 extends Service {
	constructor(broker: ServiceBroker) {
		super(broker);

		this.parseServiceSchema({
			name: "test2",
			created: [() => {}, () => {}],
			started: [async () => {}, async () => {}],
			stopped: [async () => {}, async () => {}]
		});
	}
}

const testService1 = new TestService1(broker);
expectType<ServiceSchema>(testService1.schema);

const testService2 = new TestService2(broker);
expectType<ServiceSchema>(testService2.schema);

