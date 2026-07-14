import { TCComponentWrapper } from '@event-bus/tc-component-wrapper';

interface TimerHost {
    reset(): void;
}

export class TimerTCComponent extends TCComponentWrapper<TimerHost> {
    override init(): void {
        this.host.reset();
    }
}
