import { html, css } from 'lit-element';
import { NotesTCComponent } from './notes-tc-component';
import { TcStyledElement } from '@compat/lit-styles-compat';

class NotesComponent extends TcStyledElement {
    static get styles() {
        return [
            css`
                .block-title {
                    height: 2rem;
                }
            `
        ];
    }

    firstUpdated(): void {
        new NotesTCComponent(this);
    }

    addNotes(notes: unknown): void {
        this.shadowRoot!.getElementById('notes')!.innerHTML = notes as string;
    }

    render() {
        return html` <div id="notes"></div> `;
    }
}

customElements.define('tc-notes', NotesComponent);
