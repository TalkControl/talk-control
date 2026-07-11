import config from '../../../config/config.json';
import ngrok from '@ngrok/ngrok';

// L'env est prioritaire : le token n'a plus besoin d'exister dans un fichier (IMP-003).
export const resolveNgrokAuthToken = (configToken: string): string => process.env.NGROK_AUTHTOKEN || configToken;

export const getUrl = async (port: number): Promise<string> => {
    const authToken = resolveNgrokAuthToken(config.ngrok.authToken);
    if (!authToken) {
        return '';
    }

    const listener = await ngrok.forward({
        authtoken: authToken,
        proto: 'http',
        addr: port
    });

    return listener.url() ?? '';
};

export default { getUrl };
