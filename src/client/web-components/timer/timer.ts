import { customElement, query } from 'lit/decorators.js';
import { TcStyledElement } from '@compat/lit-styles-compat';
import { html, css } from 'lit';
import { TimerTCComponent } from './timer-tc-component';
import { formatTime as sharedFormatTime } from '@client/web-components/shared/format-time';

@customElement('tc-timer')
export class TimerComponent extends TcStyledElement {
    @query('#timer') timerElement!: HTMLElement;
    restartTimer: () => void = () => undefined;

    static styles = css`
        #timer {
            cursor: pointer;
            user-select: none;
        }
    `;

    firstUpdated(): void {
        new TimerTCComponent(this);
    }

    formatTime(time: number): string | number {
        return sharedFormatTime(time);
    }

    startTimer(): () => void {
        let seconds = 0,
            minutes = 0,
            hours = 0;
        const add = () => {
            seconds++;
            if (seconds >= 60) {
                seconds = 0;
                minutes++;
                if (minutes >= 60) {
                    minutes = 0;
                    hours++;
                }
            }
            this.timerElement.textContent = `${this.formatTime(hours)}:${this.formatTime(minutes)}:${this.formatTime(seconds)}`;
        };
        const intervalID = setInterval(add, 1000);
        return () => {
            clearInterval(intervalID);
            seconds = 0;
            minutes = 0;
            hours = 0;
            this.timerElement.textContent = '00:00:00';
        };
    }

    reset(): void {
        this.restartTimer();
        this.restartTimer = this.startTimer();
    }

    render() {
        return html` <div class="is-size-3 is-unselectable" id="timer" @click="${this.reset}">00:00:00</div> `;
    }
}
