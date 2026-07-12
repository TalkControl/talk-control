import { customElement } from 'lit/decorators.js';
import { TcStyledWithFaElement } from '@compat/lit-styles-compat';
import { html } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { icon } from '@fortawesome/fontawesome-svg-core';
import { faChalkboard, faChalkboardTeacher } from '@fortawesome/free-solid-svg-icons';
import { getOrCreateSessionId, withSessionId } from '@services/session';

@customElement('tc-view-selector')
export class ViewSelectorComponent extends TcStyledWithFaElement {
    render() {
        // Toutes les vues embarquent le MÊME sessionId (?s=...) : c'est lui qui
        // les regroupe dans la même room côté serveur (IMP-002). Un lien sans le
        // param ouvrirait une vue isolée, désynchronisée du reste.
        const sessionId = getOrCreateSessionId();
        return html`
            <div class="columns">
                <div class="column is-one-fifth">
                    <a href="${withSessionId('on-stage.html', sessionId)}">
                        <div id="onStageButton" class="card">
                            <div class="card-content has-text-centered">
                                <p class="title">${unsafeHTML(icon(faChalkboard).html[0])}</p>
                                <p class="subtitle">Stage view</p>
                            </div>
                        </div>
                    </a>
                </div>
                <div class="column is-one-fifth is-hidden-tablet">
                    <!-- Mobile version -->
                    <a href="${withSessionId('presenter-mobile.html', sessionId)}">
                        <div class="card">
                            <div class="card-content has-text-centered">
                                <p class="title">${unsafeHTML(icon(faChalkboardTeacher).html[0])}</p>
                                <p class="subtitle">Presenter view</p>
                            </div>
                        </div>
                    </a>
                </div>
                <div class="column is-one-fifth is-hidden-mobile">
                    <!-- Desktop version -->
                    <a href="${withSessionId('presenter.html', sessionId)}">
                        <div class="card">
                            <div class="card-content has-text-centered">
                                <p class="title">${unsafeHTML(icon(faChalkboardTeacher).html[0])}</p>
                                <p class="subtitle">Presenter view</p>
                            </div>
                        </div>
                    </a>
                </div>
            </div>
        `;
    }
}
