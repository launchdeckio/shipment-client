'use strict';

const {trimEnd, forEach, camelCase} = require('lodash');

const got  = require('got');
const uuid = require('uuid');
const ursa = require('ursa');

const RunningAction = require('./RunningAction');

/**
 * Shipment HTTP server client wrapper
 */
class ShipmentClient {

    constructor({endpoint, encrypted, key}) {
        this.endpoint  = endpoint;
        this.verifyKey = uuid.v1();
        this.encrypted = encrypted;
        if (this.encrypted)
            this.key = ursa.createPublicKey(key);
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
        let url = `${trimEnd(this.endpoint, '/')}/${action}`;

        // Instantiate the stream
        let stream = got.stream(url, {
            method:  'POST',
            headers: {'Content-Type': 'application/json'},
        });

        // Send the body
        const payload = this.createPayload(args);

        stream.write(JSON.stringify(payload));
        stream.end();

        return new RunningAction(this, action, args, stream);
    }

    /**
     * Create a payload for a POST request to an action using the given arguments
     * @param {Object} args
     * @returns {Object}
     */
    createPayload(args) {
        let payload = {args, verifyKey: this.verifyKey};
        return this.encrypted ? this.encryptPayload(payload) : payload;
    }

    /**
     * Encrypt the given payload
     * @param {Object} payload
     * @returns {Object}
     */
    encryptPayload(payload) {
        return {encrypted: this.key.encrypt(JSON.stringify(payload), 'utf8', 'base64')};
    }

    /**
     * Create a client instance with "magic methods" for every available action
     *
     * @param endpoint
     * @param {String} [name] Optional name that will be verified against app name provided by the remote
     * @param {Boolean} [requireEncrypted = false]
     * @param {Boolean} [magic = true] Create "magic methods" for the available actions
     *
     * @returns {Promise.<ShipmentClient>}
     */
    static create(endpoint, {
        name,
        requireEncrypted = false,
        magic = true
    } = {}) {

        // Call GET / on the endpoint to ensure connectivity and retrieve the available endpoints
        return got(endpoint, {json: true}).then(response => {
            const body = response.body;

            // If a name was given for the client, check if the given name matches
            if (name && name !== body.app.name)
                throw new Error(`App name "${body.app.name}" does not match expected name "${name}"`);

            if (requireEncrypted && !body.encrypted)
                throw new Error('Encryption was set to required but not supported by the shipment server.');

            const {encrypted, key} = body;

            const client = new ShipmentClient({endpoint, encrypted, key});

            if (magic) forEach(body.app.actions, (info, action) => {
                client[camelCase(action)] = args => client.call(action, args);
            });

            return client;
        });
    }
}

module.exports = ShipmentClient;