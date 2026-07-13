import { customElement, query } from 'lit/decorators.js';
import { html, css } from 'lit';
import { NotesTCComponent } from './notes-tc-component';
import { TcStyledElement } from '@compat/lit-styles-compat';

@customElement('tc-notes')
export class NotesComponent extends TcStyledElement {
    @query('#notes') notesElement!: HTMLElement;

    static styles = css`
        .block-title {
            height: 2rem;
        }
    `;

    firstUpdated(): void {
        new NotesTCComponent(this);
    }

    addNotes(notes: unknown): void {
        this.notesElement.innerHTML = notes as string;
    }

    render() {
        return html` <div id="notes"></div> `;
    }
}
