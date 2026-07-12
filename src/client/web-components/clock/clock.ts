import { customElement, query } from 'lit/decorators.js';
import { TcStyledElement } from '@compat/lit-styles-compat';
import { html } from 'lit';

@customElement('tc-clock')
export class ClockComponent extends TcStyledElement {
    @query('#clock') clock!: HTMLElement;

    firstUpdated(): void {
        this.startClock();
    }

    formatTime(time: number): string | number {
        return time ? (time < 10 ? '0' + time : time) : '00';
    }

    startClock(): void {
        const updateTime = () => {
            const today = new Date();
            const hours = today.getHours();
            const minutes = today.getMinutes();
            this.clock.textContent = `${this.formatTime(hours)}:${this.formatTime(minutes)}`;
        };
        updateTime();
        setInterval(updateTime, 1000);
    }

    render() {
        return html` <p class="is-size-4" id="clock">00:00</p> `;
    }
}
