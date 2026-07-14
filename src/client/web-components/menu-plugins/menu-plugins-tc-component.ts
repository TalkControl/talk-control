import { TCComponentWrapper } from '@event-bus/tc-component-wrapper';

interface MenuPluginsHost {
    addItemToMenu(pluginName: string): void;
    showMenu(): void;
}

export class MenuPluginsTCComponent extends TCComponentWrapper<MenuPluginsHost> {
    override init(): void {
        this.controllerComponentChannel.on('addToPluginsMenu', ({ pluginName }) => {
            this.host.addItemToMenu(pluginName);
        });
        this.controllerComponentChannel.on('deactivatePlugin', () => this.host.showMenu());
    }

    startPlugin(pluginName: string): void {
        this.controllerComponentChannel.broadcast('pluginStartingIn', { pluginName });
    }

    endPlugin(pluginName: string): void {
        this.controllerComponentChannel.broadcast('pluginEndingIn', { pluginName });
    }
}
