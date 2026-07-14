/**
 * Monte un web component Lit dans le DOM et attend son premier rendu.
 * Typé sur la classe concrète du composant plutôt que `Element`, pour éviter
 * un cast `(el as any)` à chaque site d'appel.
 */
export async function mountComponent<T extends HTMLElement & { updateComplete: Promise<boolean> }>(tag: string): Promise<T> {
    const el = document.createElement(tag) as unknown as T;
    document.body.appendChild(el);
    await el.updateComplete;
    return el;
}

export function cleanupDom(): void {
    document.body.innerHTML = '';
}

interface ResettablePluginInstance {
    zooming: boolean;
    pointer: { x: string; y: string; color: string };
    interval: ReturnType<typeof setInterval> | undefined;
    messageEventRegistered: boolean;
    initialized: boolean;
}

/**
 * Réinitialise l'état mutable d'un singleton de plugin (ex: `instance` de
 * touch-pointer) entre deux tests, sans dépendre d'un nouvel import du module.
 */
export function resetPluginInstance(instance: ResettablePluginInstance): void {
    instance.zooming = false;
    instance.pointer = { x: '0', y: '0', color: '#FF0000' };
    instance.interval = undefined;
    instance.messageEventRegistered = false;
    instance.initialized = false;
}
