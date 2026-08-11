import { Plugin } from '@plugins/plugin.js';
import { logger } from '@services/logger';
import { ZOOM_SCALE, computeZoomTransform } from './zoom';

interface PointerState {
    x: string;
    y: string;
    color: string;
}

interface MessageEventData {
    type: string;
    data?: {
        type: string;
        payload: {
            x?: string;
            y?: string;
            color?: string;
        };
    };
}

class TouchPointerInput extends Plugin {
    zooming = false;
    pointer: PointerState = { x: '0', y: '0', color: '#FF0000' };
    interval: ReturnType<typeof setInterval> | undefined;
    messageEventRegistered = false;

    /** Référence stable, sans laquelle `removeEventListener` serait impossible. */
    private readonly messageHandler = (message: MessageEvent): void => this._onMessageEvent(message);

    constructor() {
        super();
        this.type = 'touchPointerEvent';
    }

    override init(): void {
        this._addSettingsArea();
        this._addMaskArea();
        this._addPointer();

        if (!this.messageEventRegistered) {
            addEventListener('message', this.messageHandler);
            this.messageEventRegistered = true;
        }
        this.initialized = true;
    }

    override unload(): void {
        this._removeSettingsArea();
        this._removeMaskArea();
        this._removePointer();
        this._restoreFrame();

        if (this.messageEventRegistered) {
            removeEventListener('message', this.messageHandler);
            this.messageEventRegistered = false;
        }

        clearInterval(this.interval);
        this.interval = undefined;

        super.unload();
    }

    /** Shadow root de la slide courante, ou `undefined` hors vue presenter/on-stage. */
    _slideShadowRoot(): ShadowRoot | undefined {
        return document.getElementById('currentSlide')?.shadowRoot ?? undefined;
    }

    /**
     * Rend au frame l'apparence qu'il avait avant `_addPointer` : dimensions,
     * transition, curseur de zoom et transform éventuel. Sans cela, désactiver
     * le plugin en état zoomé laissait la slide hors cadre, sans retour possible (#42).
     */
    _restoreFrame(): void {
        const frame = this._slideShadowRoot()?.getElementById('slideViewFrame');
        if (frame) {
            frame.style.width = '';
            frame.style.height = '';
            frame.style.transitionDuration = '';
            frame.style.cursor = '';
            frame.style.transform = '';
        }
        this.zooming = false;
    }

    _addPointer(): void {
        const currentSlide = document.getElementById('currentSlide');
        if (!currentSlide || !currentSlide.shadowRoot) {
            return;
        }

        const slideViewFrame = currentSlide.shadowRoot.getElementById('slideViewFrame');
        if (slideViewFrame) {
            slideViewFrame.style.width = '100%';
            slideViewFrame.style.height = '100%';
            slideViewFrame.style.transitionDuration = '0.8s';
            slideViewFrame.style.cursor = 'zoom-in';
        }

        const slideViewSection = currentSlide.shadowRoot.getElementById('slideViewSection');
        if (slideViewSection) {
            const divPointer = document.createElement('div');
            divPointer.id = 'pointer';
            divPointer.style.position = 'absolute';
            divPointer.style.left = '0';
            divPointer.style.top = '0';
            divPointer.style.width = '12px';
            divPointer.style.height = '12px';
            divPointer.style.borderRadius = '6px';
            divPointer.style.backgroundColor = '#FF0000';
            divPointer.style.visibility = 'hidden';
            slideViewSection.append(divPointer);
        }
    }

    _removePointer(): void {
        const currentSlide = document.getElementById('currentSlide');
        if (!currentSlide || !currentSlide.shadowRoot) {
            logger.log('no current slide nor shadowroot');
            return;
        }

        const slideViewSection = currentSlide.shadowRoot.getElementById('slideViewSection');
        if (slideViewSection) {
            const pointer = currentSlide.shadowRoot.getElementById('pointer');
            if (pointer) {
                pointer.remove();
            }
        }
    }

    _addArea(tag: string, placeholderId: string): void {
        const placeholder = document.getElementById(placeholderId);
        if (placeholder) {
            placeholder.innerHTML = tag;
            placeholder.style.display = 'block';
        }
    }

    _removeArea(placeholderId: string): void {
        const placeholder = document.getElementById(placeholderId);
        if (placeholder) {
            placeholder.innerHTML = '';
            placeholder.style.display = 'none';
        }
    }

    _addSettingsArea(): void {
        this._addArea('<tc-touch-pointer-settings></tc-touch-pointer-settings>', 'placeholder1');
    }

    _removeSettingsArea(): void {
        this._removeArea('placeholder1');
    }

    _addMaskArea(): void {
        this._addArea('<tc-touch-pointer-mask></tc-touch-pointer-mask>', 'placeholder2');
    }

    _removeMaskArea(): void {
        this._removeArea('placeholder2');
    }

    _onMessageEvent(message: MessageEvent): void {
        if (!message || !message.data) {
            return;
        }

        const msgData = message.data as MessageEventData;

        if (!msgData.data || typeof msgData.data !== 'object') {
            return;
        }

        if (msgData.type === 'pluginEventIn') {
            return;
        }

        const messageData = msgData.data;

        if (messageData.type === 'pointerMove') {
            this._setPointer(messageData.payload.x ?? '0', messageData.payload.y ?? '0');
            return;
        }

        if (messageData.type === 'pointerColor') {
            this._setPointerColor(messageData.payload.color ?? '');
            return;
        }

        if (messageData.type === 'pointerClick') {
            // Les coordonnées arrivent en POURCENTAGE de la zone de masque : elles ne sont
            // converties en pixels qu'à l'intérieur de _toggleZoom, dans le repère du frame
            // (cf. zoom.ts). Les convertir ici contre la fenêtre était le bug #41.
            this._toggleZoom(messageData.payload.x ?? '0', messageData.payload.y ?? '0');
        }
    }

    _setPointer(x: string, y: string): void {
        const currentSlide = document.getElementById('currentSlide');
        if (!currentSlide || !currentSlide.shadowRoot) {
            return;
        }

        const pointer = currentSlide.shadowRoot.getElementById('pointer');
        if (pointer) {
            clearInterval(this.interval);
            pointer.style.visibility = 'visible';
            pointer.style.left = this.pointer.x = x;
            pointer.style.top = this.pointer.y = y;
            this.interval = setInterval(() => {
                pointer.style.visibility = 'hidden';
            }, 2000);
        }
    }

    _setPointerColor(color: string): void {
        const currentSlide = document.getElementById('currentSlide');
        if (!currentSlide || !currentSlide.shadowRoot) {
            return;
        }

        const pointer = currentSlide.shadowRoot.getElementById('pointer');
        if (pointer) {
            pointer.style.backgroundColor = this.pointer.color = color;
        }
    }

    _toggleZoom(xPercent: string, yPercent: string): void {
        const currentSlide = document.getElementById('currentSlide');
        if (!currentSlide || !currentSlide.shadowRoot) {
            return;
        }

        const element = currentSlide.shadowRoot.getElementById('slideViewFrame');
        if (!element) {
            return;
        }

        if (this.zooming) {
            this._resetZoom(element);
            return;
        }

        // getBoundingClientRect() plutôt que offsetWidth : on ne passe ici qu'en état
        // dézoomé, donc le rect vaut la boîte de mise en page, et il tient compte d'un
        // éventuel scale porté par un ancêtre.
        const box = element.getBoundingClientRect();
        const point = {
            x: this._convertPercentToCoordinates(xPercent, box.width),
            y: this._convertPercentToCoordinates(yPercent, box.height)
        };
        const translation = computeZoomTransform(box, point, ZOOM_SCALE);

        element.style.transform = `translateX(${Math.round(translation.x)}px) translateY(${Math.round(translation.y)}px) scale(${ZOOM_SCALE})`;
        element.style.cursor = 'zoom-out';
        this.zooming = true;
    }

    _resetZoom(element: HTMLElement): void {
        element.style.transform = 'translate3D(0px, 0px, 0px)';
        element.style.cursor = 'zoom-in';
        this.zooming = false;
    }

    _convertPercentToCoordinates(percentValue: string, size: number): number {
        return (Number(percentValue.replace('%', '')) * size) / 100;
    }
}

export const instance = new TouchPointerInput();
