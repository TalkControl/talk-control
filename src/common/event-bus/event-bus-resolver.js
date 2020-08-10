'use strict';

import { EventBusWebsocketsServer } from './websockets/event-bus-websockets-server.js';
import { EventBusWebsocketsClient } from './websockets/event-bus-websockets-client.js';
import { EventBusPostMessage } from './postmessage/event-bus-postmessage.js';
import { eventBusLogger } from './event-bus-logger';

export const MASTER_SERVER_CHANNEL = 'MASTER_SERVER_CHANNEL';
export const MASTER_SLAVE_CHANNEL = 'MASTER_SLAVE_CHANNEL';

/**
 * @classdesc Instantiate event buses based on params given
 * @class EventBusResolver
 */
export class EventBusResolver {
    constructor(params) {
        this.channels = {};

        if (params.server) {
            if (params.client) {
                // Master
                this.channels[MASTER_SERVER_CHANNEL] = new EventBusWebsocketsClient(params.server);
            } else {
                // Server
                this.channels[MASTER_SERVER_CHANNEL] = new EventBusWebsocketsServer(params.server);
            }
        }

        if (typeof window != 'undefined') {
            // Slave
            this.channels[MASTER_SLAVE_CHANNEL] = new EventBusPostMessage(params.postMessage || {});
        }
    }

    /**
     *
     * @param {MASTER_SERVER_CHANNEL | MASTER_SLAVE_CHANNEL} dest - Channel to which to broadcast
     * @param {string} key - Event key to fire
     * @param {*} data - Data to broadcast
     * @throws Will throw an error if key is not specified or if dest is incorrect
     */
    broadcast(dest, key, data) {
        if (![MASTER_SERVER_CHANNEL, MASTER_SLAVE_CHANNEL].includes(dest)) {
            throw new Error(`'${dest}' is not a known destination.`);
        }
        
        eventBusLogger.log(`BROADCAST '${key}' on ${dest} with: ${data ? JSON.stringify(data) : 'no data'}`);
        this.channels[dest].broadcast(key, data);
    }

    /**
     * Emit data for the dedicated channel passed in parameter on given event key
     *
     * @param {MASTER_SERVER_CHANNEL | MASTER_SLAVE_CHANNEL} dest - Channel to which to emit
     * @param {string} key
     * @param {any} data
     * @param {any} channel
     */
    emit(dest, key, data, channel) {
        if (![MASTER_SERVER_CHANNEL, MASTER_SLAVE_CHANNEL].includes(dest)) {
            throw new Error(`'${dest}' is not a known destination.`);
        }

        eventBusLogger.log(`EMIT '${key}' on ${dest} to dedicate channel ${channel} with: ${data ? JSON.stringify(data) : 'no data'}`);
        this.channels[dest].emit(key, data, channel);
    }

    /**
     *
     * @param {MASTER_SERVER_CHANNEL | MASTER_SLAVE_CHANNEL} src - Source channel from which to listen
     * @param {string} key - Event key to listen
     * @param {*} callback - Function to call when the event is fired
     * @throws Will throw an error if key is not specified or if src is incorrect
     */
    onMultiple(src, key, callback) {
        if (![MASTER_SERVER_CHANNEL, MASTER_SLAVE_CHANNEL].includes(src)) {
            throw new Error(`'${src}' is not a known source.`);
        }

        eventBusLogger.log(`ON Multiple '${key}' on ${src}`);
        this.channels[src].onMultiple(key, callback);
    }
    
    /**
     *
     * @param {MASTER_SERVER_CHANNEL | MASTER_SLAVE_CHANNEL} src - Source channel from which to listen
     * @param {string} key - Event key to listen
     * @param {*} callback - Function to call when the event is fired
     * @throws Will throw an error if key is not specified or if src is incorrect
     */
    on(src, key, callback) {
        if (![MASTER_SERVER_CHANNEL, MASTER_SLAVE_CHANNEL].includes(src)) {
            throw new Error(`'${src}' is not a known source.`);
        }

        try {
            this.channels[src].on(key, callback);
        } catch (e) {
            eventBusLogger.log('on event bus resolver error: ', [key, e.message], true);
        }
    }
}
