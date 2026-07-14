import { customElement, property, query } from 'lit/decorators.js';
import { html, css, PropertyValues } from 'lit';
import { TouchPointerMaskTCComponent } from './touch-pointer-mask-tc-component';
import { TcStyledElement } from '@compat/lit-styles-compat';

@customElement('tc-touch-pointer-mask')
export class TouchPointerMaskComponent extends TcStyledElement {
    @property({ type: Object }) pointer: { x: string | number; y: string | number; color: string } = { x: 0, y: 0, color: '#FF00000' };
    @property({ type: Object }) touchPointerMaskTCComponent!: TouchPointerMaskTCComponent;

    @query('#touchMask') touchMask!: HTMLElement;

    static styles = css`
        #touchMask {
            width: 100%;
            height: 100%;
            border: 4px solid red;
        }
    `;

    override firstUpdated(_changedProperties: PropertyValues): void {
        super.firstUpdated(_changedProperties);
        this.touchPointerMaskTCComponent = new TouchPointerMaskTCComponent();
        this._initPointerDblClick();
        this._initPointerMove();
    }

    render() {
        return html` <div id="touchMask" /> `;
    }

    _initPointerDblClick(): void {
        this.touchMask.addEventListener('click', () =>
            this.touchPointerMaskTCComponent.sendPointerEventToController({
                origin: 'touchPointer',
                type: 'pointerClick',
                payload: { x: this.pointer.x, y: this.pointer.y }
            })
        );
    }

    _initPointerMove(): void {
        const touchMask = this.touchMask;
        const movePointer = (x: number, y: number) => {
            this.pointer.x = `${this._getPositionInPercent(x, touchMask.offsetWidth)}%`;
            this.pointer.y = `${this._getPositionInPercent(y, touchMask.offsetHeight)}%`;

            this.touchPointerMaskTCComponent.sendPointerEventToController({
                origin: 'touchPointer',
                type: 'pointerMove',
                payload: { x: this.pointer.x, y: this.pointer.y }
            });
        };

        touchMask.addEventListener('mousemove', (e: MouseEvent) => {
            movePointer(e.offsetX, e.offsetY);
        });
        touchMask.addEventListener('touchmove', (e: TouchEvent) => {
            const touch = e.changedTouches.length ? e.changedTouches[0] : null;
            if (touch) {
                const rect = (touch.target as Element).getBoundingClientRect();
                const x = touch.pageX - rect.left;
                const y = touch.pageY - rect.top;
                movePointer(x, y);
            }
        });
    }

    _getPositionInPercent(value: number, size: number): number {
        return Math.round((value * 100) / size);
    }
}
