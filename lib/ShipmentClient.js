'use strict';

const _    = require('lodash');
const got  = require('got');
const uuid = require('node-uuid');

const RunningAction = require('./RunningAction');

/**
 * Shipment HTTP server client wrapper
 */
class ShipmentClient {

    constructor(endpoint) {
        this.endpoint  = endpoint;
        this.verifyKey = uuid.v1();
    }

    /**
     * Invoke the given action on the shipment server
     *
     * @param action
     * @param args
     *
     * @returns {RunningAction}
     */
    call(action, args = {}) {

        // Format the URL as endpoint/action
        let url = `${_.trimEnd(this.endpoint, '/')}/${action}`;

        // Instantiate the stream
        let stream = got.stream(url, {
            method:  'POST',
            headers: {'Content-Type': 'application/json'},
        });

        // Send the body
        stream.write(JSON.stringify({args, verifyKey: this.verifyKey}));
        stream.end();

        return new RunningAction(this, action, args, stream);
    }

    /**
     * Create a client instance with "magic methods" for every available action
     *
     * @param endpoint
     * @param {String} [name] Optional name that will be verified against app name provided by the remote
     *
     * @returns {*}
     */
    static create(endpoint, name) {
        return got(endpoint, {json: true}).then(response => {
            if (name && name !== response.body.app.name)
                throw new Error(`App name "${response.body.app.name}" does not match expected name "${name}"`);
            let client = new ShipmentClient(endpoint);
            _.forEach(response.body.app.actions, (info, action) => {
                client[_.camelCase(action)] = args => client.call(action, args);
            });
            return client;
        });
    }
}

module.exports = ShipmentClient;