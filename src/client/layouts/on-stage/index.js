'use strict';

import { TalkControlMaster } from '../../talk-control-master/talk-control-master.js';
import config from '@config/config.json';

window.addEventListener('DOMContentLoaded', function() {
    // Event fired from <tc-url-form> component
    addEventListener('url-changed', event => {
        const url = event.detail.url;
        if (url) {
            const slideViews = document.querySelectorAll('tc-slide');
            const urlForm = document.querySelector('tc-url-form');

            slideViews.forEach(slideView => {
                slideView.url = url;
                slideView.classList.remove('is-hidden');
            });
            urlForm.classList.add('is-hidden');
        }
    });

    const talkControlMaster = new TalkControlMaster(config.tcServer.url);
    talkControlMaster.init();
});
