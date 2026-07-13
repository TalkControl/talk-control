import { TCComponentWrapper } from '@event-bus/tc-component-wrapper';
import pluginService from '@services/plugin';

interface SlideViewHost {
    url: unknown;
}

export class SlideViewTCComponent extends TCComponentWrapper<SlideViewHost> {
    constructor(slideView: SlideViewHost) {
        super(slideView);

        this.controllerComponentChannel.on('loadPresentation', url => {
            this.host.url = url;
            this.controllerComponentChannel.broadcast('presentationLoading');
        });
    }

    override init(): void {
        this.controllerComponentChannel.on('activatePlugin', ({ pluginName }) => {
            pluginService.activateOnComponent(pluginName, this);
        });
    }

    setLoaded(): void {
        this.controllerComponentChannel.broadcast('presentationLoaded');
    }
}
