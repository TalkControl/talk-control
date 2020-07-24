'use strict';

import { TalkControlMaster } from '../../talk-control-master/talk-control-master.js';
import config from '@config/config.json';

window.addEventListener('DOMContentLoaded', function() {
    const isRemote = window.location.href.indexOf('://localhost:') === -1;

    const talkControlMaster = new TalkControlMaster(isRemote ? config.tcServer.urls.external : config.tcServer.urls.local);
    talkControlMaster.init();
});
