'use strict';

import 'module-alias/register';
import { expect } from 'chai';
import { stub, spy } from 'sinon';
import { EventBusResolver, MASTER_SERVER_CHANNEL, MASTER_SLAVE_CHANNEL } from '@event-bus/event-bus-resolver';
import { EventBusWebsocketsClient } from '@event-bus/websockets/event-bus-websockets-client';
import socketIOClient from 'socket.io-client';
import config from '@config/config.json';

describe('EventBusResolver', function() {
    describe('constructor()', function() {
        before(function() {
            stub(socketIOClient, 'connect').returns({ on: spy() });
        });

        after(function() {
            socketIOClient.connect.restore();
        });

        // ! Could not implement because no server to connect to
        // ! Throws 'TypeError: server.listeners is not a function'
        // it('shoud instantiate a SocketServer', function() {
        //     // When
        //     resolver = new EventBusResolver({ server: config.tcServer.urls.local });
        //     // Then
        //     expect(resolver.socketBus instanceof EventBusWebsocketsServer).to.be.true;
        // });

        it('shoud instantiate a SocketClient', function() {
            // When
            const resolver = new EventBusResolver({ server: config.tcServer.urls.local, client: true });
            // Then
            expect(resolver.channels[MASTER_SERVER_CHANNEL] instanceof EventBusWebsocketsClient).to.be.true;
        });

        it('shoud instantiate a Postmessage', function() {
            // Given
            // global.window = { addEventListener: () => undefined, postMessage: spy() };
            stub(window, 'addEventListener');
            stub(window, 'postMessage');
            // When
            const resolver = new EventBusResolver({});
            // Then
            expect(resolver.channels[MASTER_SLAVE_CHANNEL]).to.be.ok;

            window.addEventListener.restore();
            window.postMessage.restore();
        });
    });

    describe('emit', function() {
        it('should throw an error', function() {
            const resolver = new EventBusResolver({});
            expect(() => resolver.emit('desc', 'key', 'data')).to.throw("'desc' is not a known destination.");
        });
    });

    describe('on', function() {
        it('should throw an error', function() {
            const resolver = new EventBusResolver({});
            expect(() => resolver.on('src', 'key', () => 'callback')).to.throw("'src' is not a known source.");
        });
    });
});
