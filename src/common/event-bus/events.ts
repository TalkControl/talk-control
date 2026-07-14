import type { Slide } from './slide';
import type { PluginDescriptor } from './plugin-descriptor';

/**
 * Une entrée par événement métier transitant sur un EventBus (canal
 * CONTROLLER_SERVER ou CONTROLLER_COMPONENT). connection/disconnect sont des
 * events natifs socket.io, hors périmètre (IMP-007).
 *
 * `init` a deux usages réels distincts sur les deux canaux : simple trigger
 * sans payload côté composant (EventBusComponent.on('init', ...)), et
 * `{ slides }` transmis côté serveur (relais de `initialized`) — d'où l'union.
 *
 * `pluginEventIn`/`pluginEventOut` restent `unknown` : ce sont des payloads
 * de plugin pass-through, volontairement non sur-typés (cf. step-11, risques).
 * `sendNotesToController`/`sendNotesToComponent` restent `unknown` : le format
 * des notes dépend de l'engine (RevealJS getSlideNotes), jamais typé ailleurs.
 * `deactivatePlugin`/`touchPointer` n'ont aujourd'hui aucun émetteur (handlers
 * orphelins) : payload `undefined`, ignoré par leurs handlers actuels.
 */
export interface TcEventMap {
    activatePlugin: { pluginName: string };
    addToPluginsMenu: { pluginName: string };
    deactivatePlugin: undefined;
    error: { type: string };
    gotoSlide: { slide: Partial<Slide> };
    init: { slides: Slide[] } | undefined;
    initialized: { slides: Slide[] };
    inputEvent: { key: string };
    loadPresentation: string;
    pluginEndingIn: { pluginName: string };
    pluginEndingOut: { pluginName: string };
    pluginEventIn: unknown;
    pluginEventOut: unknown;
    pluginsList: PluginDescriptor[];
    pluginStartingIn: { pluginName: string };
    pluginStartingOut: { pluginName: string };
    ping: undefined;
    pong: undefined;
    presentationLoaded: undefined;
    presentationLoading: undefined;
    sendNotesToComponent: unknown;
    sendNotesToController: unknown;
    touchPointer: undefined;
}

export type TcEventName = keyof TcEventMap;

/**
 * Résout le payload attendu pour une clé K : le type exact si K est un événement
 * métier connu, `unknown` sinon (canaux dynamiques de plugin, ex. plugin.instance.type).
 * Un seul signature générique (pas de surcharges) : avec des surcharges, TS retombe
 * silencieusement sur la variante `string` dès qu'un payload ne correspond pas au type
 * attendu, ce qui annule toute vérification (constaté en test manuel, IMP-007).
 */
export type PayloadFor<K> = K extends TcEventName ? TcEventMap[K] : unknown;
