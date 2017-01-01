# TODO

## Common
- multi params for call & return array
- create d.ts file
- use parambulator in actions
	```js
	add: {
		cache: true,
		params: {
			a: {type$:'number'},
			b: {type$:'number', gt$:0}
		},
		handler(ctx) {

		}
	}
	```

## Services
- started(), stopped() event handlers. It will called by broker.start and stop

## Transporters
- add gzip support

## Cachers

## Context
