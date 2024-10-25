type GetComputed<TComputed> = {
	[key in keyof TComputed]: TComputed[key] extends () => infer Result ? Result : never;
  };

  class Service {
	public broker?: string
  }

  interface Schema<TMetadata, TSettings, TMethods, TVersion> {
	name: string;
	version?: TVersion extends (string | number) ? TVersion : never;
	metadata?: TMetadata;
	settings?: TSettings;
	methods: TMethods & ThisType<TMethods & { name: string, version: TVersion, metadata: TMetadata, settings: TSettings}>;
  };

  declare function createFromSchema<TMetadata, TSettings, TMethods, TVersion>(
	schema: Schema<TMetadata, TSettings, TMethods, TVersion>
  ): Service & TMethods & { name: string, version: TVersion, metadata: TMetadata, settings: TSettings};


  const svc = createFromSchema({
	name: "posts",
	version: 2,

	metadata: {
	  region: "us-west",
	  zone: "b",
	  cluster: false,
	},
	settings: {
	  a: 10,
	  b: "Test2",
	},

	methods: {
	  uppercase(str: string): string {
		console.log(this.metadata.region);
		console.log(this.settings.b);
		return str.toUpperCase();
	  },

	  greetings(): string {
		return this.uppercase(`Hello from ${this.name} ${this.version}`);
	  }
	},
  })

  console.log(svc.name);
  console.log(svc.version);
  console.log(svc.broker);
  console.log(svc.greetings(););
  console.log(svc.settings.a);
  console.log(svc.metadata.region);
