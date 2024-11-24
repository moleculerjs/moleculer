import type { ServiceBroker } from "../broker";
import type { Service } from "../service";
import { BaseRegistry, type BaseRegistryOptions } from "./base";
import { Node } from "./node";

// export interface LocalRegistryOptions extends BaseRegistryOptions {}

declare module "../brokerOptions" {
	interface RegistryTypes {
		local: "Local";
		localObj: {
			type: "Local";
			options?: Partial<BaseRegistryOptions>;
		};
	}
}

interface RegistryRecord {
	node: Node;
	updatedAt: number;
	lastHeartbeatTime: number;
}

export class LocalRegistry extends BaseRegistry {
	private readonly registry: RegistryRecord[];
	private readonly localRecord: RegistryRecord;

	public constructor(broker: ServiceBroker, opts: BaseRegistryOptions) {
		super(broker, opts);

		const localNode = new Node(this.broker.nodeID, true);
		// TODO: localNode.updateInfo({});

		this.localRecord = {
			node: localNode,
			updatedAt: Date.now(),
			lastHeartbeatTime: Date.now(),
		};

		this.registry = [this.localRecord];
	}

	public get localNode(): Node {
		return this.localRecord.node;
	}

	public override registerLocalService(service: Service): void {
		let services = this.localRecord.node.info?.services;
		if (!services) {
			services = [];
			this.localRecord.node.info!.services = services;
		}

		services.push(service.getServiceInfo());
	}
}
