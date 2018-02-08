'use strict';

const {trimEnd} = require('lodash');
const got       = require('got');

const RunningAction = require('./RunningAction');

const pkg       = require('./../package.json');
const userAgent = `shipment-client/${pkg.version}`;

/**
 * Shipment HTTP server client wrapper
 */
class ShipmentClient {

    constructor({endpoint}) {
        this.endpoint = endpoint;
    }

    /**
     * Invoke the given action on the shipment server
     *
     * @param {String} action
     * @param {Object} [args]
     * @param {Function} [receive]
     * @param {Object} [rest]
     *
     * @returns {RunningAction}
     */
    call({action, args = {}, receive, ...rest}) {

        // Format the URL as endpoint/action
        let url = `${trimEnd(this.endpoint, '/')}/${action}`;

        // Instantiate the stream
        let stream = got.stream(url, {
            method:  'POST',
            headers: {
                'user-agent':   userAgent,
                'Content-Type': 'application/json'
            },
        });

        // Send the body
        stream.write(JSON.stringify(args));
        stream.end();

        return new RunningAction({
            client: this,
            action,
            args,
            stream,
            receive,
            ...rest,
        });
    }

    /**
     * Create a client instance with "magic methods" for every available action
     * @param endpoint
     * @param {String} [name] Optional name that will be verified against app name provided by the remote
     * @param {Boolean} [magic = true] Create "magic methods" for the available actions
     * @returns {Promise.<ShipmentClient>}
     */
    static async create(endpoint, {

        magic = true

    } = {}) {

        const response = await got(endpoint, {
            json:    true,
            headers: {
                'user-agent': userAgent,
            }
        });

        const body = response.body;

        const client = new ShipmentClient({endpoint});

        if (magic) body.app.actions.forEach(action => {
            client[action] = (args, receive) => client.call({action, args, receive});
        });

        return client;
    }
}

module.exports = ShipmentClient;