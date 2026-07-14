import { customElement, state } from 'lit/decorators.js';
import { html, css } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { NotesTCComponent } from './notes-tc-component';
import { TcStyledElement } from '@compat/lit-styles-compat';

@customElement('tc-notes')
export class NotesComponent extends TcStyledElement {
    @state() private notes = '';

    static styles = css`
        .block-title {
            height: 2rem;
        }
    `;

    firstUpdated(): void {
        new NotesTCComponent(this);
    }

    addNotes(notes: unknown): void {
        this.notes = (notes as string) ?? '';
    }

    render() {
        // Les notes viennent de la présentation distante (sendNotesToComponent, format non
        // contractualisé — cf. IMP-007) : HTML injecté tel quel, à dessein. La source est
        // semi-fiable (la présentation que le présentateur a lui-même choisie) et le vrai
        // contrôle est la validation anti-SSRF de l'URL de présentation (IMP-001).
        return html` <div id="notes">${unsafeHTML(this.notes)}</div> `;
    }
}
