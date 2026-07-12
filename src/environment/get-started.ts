import { styleText } from 'node:util';
import config from '../../config/config.json';

console.log(styleText(['bgBlueBright', 'bold'], '\n\n\tWelcome to TalkControl\n'));
console.log(
    styleText(
        'gray',
        `
    TC Controller is running on port ${config.tcController.port}
    TalkControl SERVER is running on port ${config.tcServer.port}
    SHOWCASE is served on port ${config.tcShowcase.port}`
    )
);
console.log(
    `
    Use TalkControl from localhost:`
);
console.log(styleText('green', `    Get started by opening url: ${config.tcController.urls.local}`));
console.log(
    `
    Use TalkControl remotely:`
);
if (config.tcController.urls.external) {
    console.log(styleText('green', `    Get started by opening url: ${config.tcController.urls.external}`));
} else {
    console.log(
        styleText(
            'cyan',
            `    TalkControl use ngrok to be accessible remotely:
        1. Create an account and login on https://ngrok.com/
        2. Get your auth token on page https://dashboard.ngrok.com/auth
        3. Export it as an env variable: NGROK_AUTHTOKEN=<token>
           (or add it to config/config.json — gitignored, never commit a token)
        4. Quit and restart TalkControl with npm start`
        )
    );
}
console.log(styleText('bgBlueBright', '\n'));
console.log('\n');
