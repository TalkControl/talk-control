import { customElement, query } from 'lit/decorators.js';
import { TcStyledElement } from '@compat/lit-styles-compat';
import { html } from 'lit';
import { formatTime } from '@client/web-components/shared/format-time';

@customElement('tc-clock')
export class ClockComponent extends TcStyledElement {
    @query('#clock') clock!: HTMLElement;

    firstUpdated(): void {
        this.startClock();
    }

    startClock(): void {
        const updateTime = () => {
            const today = new Date();
            const hours = today.getHours();
            const minutes = today.getMinutes();
            this.clock.textContent = `${formatTime(hours)}:${formatTime(minutes)}`;
        };
        updateTime();
        setInterval(updateTime, 1000);
    }

    render() {
        return html` <p class="is-size-4" id="clock">00:00</p> `;
    }
}
