import { TcStyledElement } from '@compat/lit-styles-compat';
import { html } from 'lit';
import { config } from '@services/config';
import { getOrCreateSessionId, withSessionId } from '@services/session';
import QRCode from 'qrcode';

class RemoteControlComponent extends TcStyledElement {
    static get properties() {
        return {};
    }

    firstUpdated(): void {
        if (config.tcController.urls.external) {
            // L'URL du QR code doit porter le token de session : sans lui, le
            // mobile serait rejeté par le serveur socket (IMP-002).
            const remoteUrl = withSessionId(config.tcController.urls.external, getOrCreateSessionId());
            QRCode.toCanvas(this.shadowRoot!.getElementById('qrCode') as HTMLCanvasElement, remoteUrl);
            this.shadowRoot!.getElementById('textCode')!.innerHTML =
                `<a href="${remoteUrl}" title="Use this url to connect to TalkControl from another device">${remoteUrl}</a>`;
        } else {
            this.shadowRoot!.getElementById('qrCodeSection')!.classList.add('is-hidden');
        }
    }

    render() {
        return html`
            <div id="qrCodeSection">
                <h2 class="subtitle">Or take control from another device</h2>
                <div class="columns">
                    <div class="column is-one-third">
                        <div class="card">
                            <div class="card-content has-text-centered">
                                <canvas id="qrCode" aria-label="Use this QRCode to connect to TalkControl from your mobile"></canvas><br />
                                <span id="textCode"></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('tc-remote-control', RemoteControlComponent);
