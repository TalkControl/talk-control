export type PluginEventCallback = (type: string, event: unknown) => void;

export class Plugin {
    usedByAComponent = true;
    initialized = false;
    type = '';
    callbacks: PluginEventCallback[] = [];

    onEvent(callback: PluginEventCallback): void {
        this.callbacks.push(callback);
    }

    init(): void {}

    /**
     * Défait ce que `init()` a mis en place. Les surcharges doivent appeler
     * `super.unload()` : la classe de base est responsable de l'état qu'elle
     * possède, à savoir les callbacks et le drapeau `initialized`.
     *
     * Sans cette purge, `pluginService.activateOnComponent` empile un callback
     * supplémentaire à chaque réactivation — le plugin réémet alors chacun de
     * ses événements en autant d'exemplaires qu'il y a eu de cycles (#42).
     */
    unload(): void {
        this.callbacks = [];
        this.initialized = false;
    }
}
