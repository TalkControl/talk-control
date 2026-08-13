import contextService from '@services/context';
import { Plugin } from '@plugins/plugin.js';

interface TouchPosition {
    clientX: number;
    clientY: number;
}

class TouchInput extends Plugin {
    touchPosition: { touchstart: TouchPosition; touchend: TouchPosition };

    // Références stables : sans elles, removeEventListener n'a aucune prise et
    // `unload()` laisserait les listeners actifs derrière lui (#42).
    private readonly onTouchStart = (event: TouchEvent): void => this._captureTouchEvent(event);
    private readonly onTouchEnd = (event: TouchEvent): void => this._captureTouchEvent(event, true);

    constructor() {
        super();
        this.type = 'inputEvent';
        this.touchPosition = {
            touchstart: { clientX: 0, clientY: 0 },
            touchend: { clientX: 0, clientY: 0 }
        };
    }

    override init(): void {
        addEventListener('touchstart', this.onTouchStart, false);
        addEventListener('touchend', this.onTouchEnd, false);
        this.initialized = true;
    }

    override unload(): void {
        removeEventListener('touchstart', this.onTouchStart, false);
        removeEventListener('touchend', this.onTouchEnd, false);
        super.unload();
    }

    _captureTouchEvent(event: TouchEvent, forward = false): void {
        if (!event.view) return;
        if (contextService.isPresentationIframe(event.view.location.href)) {
            const touch = event.changedTouches[0];
            if (!touch) return;
            this.touchPosition[event.type as 'touchstart' | 'touchend'] = {
                clientX: touch.clientX,
                clientY: touch.clientY
            };

            if (forward) {
                const xDiff = this.touchPosition.touchstart.clientX - this.touchPosition.touchend.clientX;
                const yDiff = this.touchPosition.touchstart.clientY - this.touchPosition.touchend.clientY;
                const xDiffPositive = xDiff < 0 ? xDiff * -1 : xDiff;
                const yDiffPositive = yDiff < 0 ? yDiff * -1 : yDiff;
                let action = '';

                if (xDiffPositive <= 20 && yDiffPositive <= 20) {
                    action = 'space';
                } else if (xDiffPositive > yDiffPositive) {
                    action = xDiff > 0 ? 'arrowRight' : 'arrowLeft';
                } else if (yDiffPositive >= xDiffPositive) {
                    action = yDiff > 0 ? 'arrowDown' : 'arrowUp';
                }

                for (const callBackMethod of this.callbacks) {
                    callBackMethod(this.type, { key: action });
                }
            }
        }
    }
}

export const instance = new TouchInput();
