'use strict';

const EventEmitter = require('events').EventEmitter;
const _            = require('lodash');
const split2       = require('split2');

const RemoteError = require('./RemoteError');

/**
 * Structure that describes a running shipment action
 * and emits events for every incoming object event
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
            this.receiveShipmentLogLine(line);
        }
        let obj;
        try {
            obj = JSON.parse(line);
        } catch (e) { // Couldn't parse the line as JSON, emit as "log"
            return this.emit('log', line);
        }
        return this.emit('emit', obj);
    }

    /**
     * Parse a shipment (internal) log line, verifying the key to check the origin of the info
     *
     * @param {String} line
     */
    receiveShipmentLogLine(line) {

        let matches;

        let prefix = `SHIPMENT-${this.client.verifyKey}: `;

        let match = (verb, line) => new RegExp(`${prefix}${verb}: (.*)`).exec(line);

        if (line === `${prefix}ok`)
            this.emit('success');

        else if ((matches = match('start', line)))
            this.emit('start', matches[1]);

        else if ((matches = match('error', line)))
            this.emit('remoteError', new RemoteError(matches[1]));
    }
}

module.exports = RunningAction;