# shipment-client

> Provides a standardized client wrapper to interface with shipment HTTP servers

### Install

```bash
$ npm install shipment-client
```

### Usage

```js

const ShipmentClient = require('shipment-client');

ShipmentClient.create('localhost:6565').then(client => {
   
    client.someAction({foo: bar});
});
```

## License

MIT © [sgtlambda](http://github.com/sgtlambda)