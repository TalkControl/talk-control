import { TCComponentWrapper } from '@event-bus/tc-component-wrapper';

interface LoaderHost {
    showSuccess(): void;
    showError(): void;
}

export class TCComponentLoaderComponent extends TCComponentWrapper<LoaderHost> {
    override init(): void {
        this.host.showSuccess();
    }

    override error(): void {
        this.host.showError();
    }
}
