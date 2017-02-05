'use strict';

const EventEmitter = require('events').EventEmitter;
const _            = require('lodash');
const split2       = require('split2');

const RemoteError = require('./RemoteError');

/**
 * Structure that represents a running shipment action
 * and emits events for every incoming line
 */
class RunningAction extends EventEmitter {

    /**
     * @param {ShipmentClient} client
     * @param {String} action
     * @param {Object} args
     * @param {Readable} stream
     */
    constructor(client, action, args, stream) {
        super();
        this.client = client;
        this.action = action;
        this.args   = args;
        this.stream = stream;
        this.stream
            .pipe(split2())
            .on('data', line => {
                this.receiveLine(line);
            })
            .on('end', () => {
                this.emit('end');
            });
    }

    /**
     * Parse incoming line
     *
     * @param {String} line
     */
    receiveLine(line) {
        if (_.startsWith(line, 'SHIPMENT')) {
            this.parseLifecycleEvent(line);
        }
        let obj;
        try {
            obj = JSON.parse(line);
            if (!obj.context)
            // object doesn't contain "context" property, probably not a shipment JSON line
            // so emit as normal "log" line anyways
                return this.emit('log', line);
        } catch (e) {
            // Couldn't parse the line as JSON, emit as "log"
            return this.emit('log', line);
        }
        return this.emit('emit', obj);
    }

    /**
     * Parse a shipment (internal) "lifecycle event", verifying the key to check the integrity of the info
     * And emit appropriate event
     * e.g. SHIPMENT-12345: ok
     *
     * @param {String} line
     */
    parseLifecycleEvent(line) {

        let matches;

        let prefix = `SHIPMENT-${this.client.verifyKey}: `;

        let match = (verb, line) => new RegExp(`${prefix}${verb}: (.*)`).exec(line);

        if (line === `${prefix}ok`)
            return this.emit('success');

        if ((matches = match('start', line)))
            return this.emit('start', matches[1]);

        if ((matches = match('error', line)))
            return this.emit('error', new RemoteError(matches[1]));
    }
}

module.exports = RunningAction;