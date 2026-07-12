import { customElement, query } from 'lit/decorators.js';
import config from '@config/config.json';
import { html } from 'lit';
import { isValidUrl } from '@services/url';
import contextService from '@services/context';
import { TcStyledElement } from '@compat/lit-styles-compat';

@customElement('tc-url-form')
export class UrlFormComponent extends TcStyledElement {
    @query('#presentationUrl') presentationUrl!: HTMLInputElement;
    @query('#validateButton') validateButton!: HTMLElement;
    @query('#updateButton') updateButton!: HTMLElement;
    @query('#urlError') urlError!: HTMLElement;

    firstUpdated(): void {
        const presentationUrl = this.presentationUrl;
        const validateButton = this.validateButton;
        const updateButton = this.updateButton;
        const urlError = this.urlError;

        presentationUrl.addEventListener('keypress', e => {
            const key = (e as KeyboardEvent).which || (e as KeyboardEvent).keyCode;
            if (key === 13) {
                validateUrl();
            }
        });
        validateButton.addEventListener('click', () => validateUrl());

        updateButton.addEventListener('click', () => {
            dispatchEvent(new CustomEvent('url-form-editing'));
            switchToEdition();
        });

        const validateUrl = () => {
            const url = presentationUrl.value;

            hideUrlError();
            if (!isValidUrl(url)) {
                showUrlError();
                return;
            }

            sessionStorage.setItem('presentationUrl', url);
            dispatchEvent(new CustomEvent('url-form-validated'));
            switchToReadOnly();
        };

        const switchToEdition = () => {
            updateButton.classList.add('is-hidden');
            validateButton.classList.remove('is-hidden');
            presentationUrl.disabled = false;
        };

        const switchToReadOnly = () => {
            validateButton.classList.add('is-hidden');
            updateButton.classList.remove('is-hidden');
            presentationUrl.disabled = true;
        };

        const hideUrlError = () => urlError.classList.add('is-hidden');
        const showUrlError = () => urlError.classList.remove('is-hidden');
    }

    render() {
        const isRemote = contextService.isUsingRemoteUrl(window.location.href);

        return html`
            <section>
                <div class="container">
                    <p class="subtitle">Enter your presentation url:</p>

                    <div class="field has-addons">
                        <div class="control">
                            <input
                                class="input"
                                type="url"
                                placeholder="http://..."
                                id="presentationUrl"
                                value="${isRemote ? config.tcShowcase.urls.external : config.tcShowcase.urls.local}"
                            />
                        </div>
                        <div class="control">
                            <a id="validateButton" class="button is-info">Validate</a>
                            <a id="updateButton" class="button is-primary is-hidden">Edit</a>
                        </div>
                    </div>
                    <!-- Error message area -->
                    <div id="urlError" class="notification is-danger is-hidden">
                        <button class="delete" @click="${() => this.urlError.classList.add('is-hidden')}"></button>
                        URL is not valid
                    </div>
                </div>
            </section>
        `;
    }
}
