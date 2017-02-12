# TODO

## Common
- multi params for multi-call & return array
- features (?)
- global config for services 
- broker node kezelést kirakni Registry class-ba, ami lehet NATS, consul...etc
- easier transporter code (only implement connect, disconnect, publish, subscribe methods) e.g. 

- create d.ts file

- cli tool for generate project & Services
	- https://github.com/sboudrias/Inquirer.js
	- https://github.com/tj/consolidate.js

	- `ices init` - generate an servicer based project
	- `ices add service` - generate an empty service
	- `ices add middleware` - generate an empty middleware
	- `ices add plugin` - generate an empty plugin
	https://github.com/tj/ngen 

- circuit breaker: https://github.com/awolden/brakes
- https://github.com/aldeed/meteor-simple-schema

- Docs: https://github.com/segmentio/metalsmith

- service register implementation (e.g. consul, etcd)



- Dynamic timeout: ctx-be legyen timeout érték. Ha subcall van, akkor adja át, de csökkentve az eltelt idővel. Ha ez nulla vagy kisebb, akkor ne is hívja meg, mert felesleges, mert a request már "elszállt timeout-al", felesleges meghívni.
- Sidecar - HTTP kliens, amivel más cuccok illeszthetőek (registerAction, registerService, call, ...etc). [Example](https://github.com/micro/micro/tree/master/car)
- általános webes kliens fejlesztéshez [example](https://github.com/micro/micro/tree/master/web)


- Service dependencies: fel lehet sorolni milyen egyéb szolgáltatásoktól függ. Broker ellenőrzni, warning-ol event-et küld, ha hiányzik egy függőség [example](http://www.slideshare.net/adriancockcroft/microservices-whats-missing-oreilly-software-architecture-new-york#24)

- Own fast validator
	- similar: https://github.com/semisleep/simple-vue-validator/blob/master/src/rule.js
```js
	const v = require("...");
	get: {
		params: v.required().object({
			id: v.required().number().min(0).max(100),
			name: v.string().minLength(0).maxLength(128),
			settings: v.object({
				notify: v.boolean().object() // 2 accepted type: Boolean or Object
			}),
			roles: v.array().enum(["admin", "user"]),
			email: v.required().email(),
			homepage: v.regex(/asd/gi)
		}
	}
```

```js
	const v = require("...");
	get: {
		params: v({
			id: { type: "number", req: true, min: 0, max: 100 },
			name: { type: "string", min: 0, max: 128 }
			settings: { type: "object", props: {
				notify: { type: ["boolean", "object" ] } // 2 accepted type: Boolean or Object
			}},
			roles: { type: "array", items: { type: "enum", enums: ["admin", "user"]),
			email: { type: "email", req: true },
			homepage: { type: "regex", pattern:/asd/gi }
		}
	}
```


## Broker
- handleExceptions: true option
	Catch unhandled exceptions and send an event with details. Can be catch in metrics, alert or logger services

- direct remote call to a specified node (for monitoring every node)

## Services
- add version to action obj and skip service in registerAction
- appendServiceName - default true "posts.find"


## Transporters
- Redis transporter
- websocket
- [AutobahnJS](http://autobahn.ws/js/) [server](https://github.com/Orange-OpenSource/wamp.rt) or [server in go](https://github.com/jcelliott/turnpike)
- add gzip support

## Cachers
- add lru features to Memory and Redis

## Context
