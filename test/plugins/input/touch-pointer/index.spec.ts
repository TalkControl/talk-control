import { instance } from '@plugins/input/touch-pointer/index.js';
import { logger } from '@services/logger';
import { resetPluginInstance } from '../../../helpers/dom';

function buildCurrentSlide(): { host: HTMLElement; shadowRoot: ShadowRoot; frame: HTMLElement; section: HTMLElement } {
    const host = document.createElement('div');
    host.id = 'currentSlide';
    document.body.append(host);
    const shadowRoot = host.attachShadow({ mode: 'open' });
    const frame = document.createElement('div');
    frame.id = 'slideViewFrame';
    const section = document.createElement('div');
    section.id = 'slideViewSection';
    shadowRoot.append(frame, section);
    return { host, shadowRoot, frame, section };
}

function messageEvent(data: unknown): MessageEvent {
    return { data } as MessageEvent;
}

describe('TouchPointerInput', function () {
    beforeEach(function () {
        resetPluginInstance(instance);
        document.body.innerHTML = '';
        document.body.append(
            Object.assign(document.createElement('div'), { id: 'placeholder1' }),
            Object.assign(document.createElement('div'), { id: 'placeholder2' })
        );
    });

    afterEach(function () {
        vi.restoreAllMocks();
    });

    describe('constructor()', function () {
        it('should set type to "touchPointerEvent"', function () {
            expect(instance.type).toBe('touchPointerEvent');
        });
    });

    describe('init() / unload()', function () {
        it('should register the message listener once and mark itself initialized', function () {
            // Given
            const addEventListenerSpy = vi.spyOn(globalThis, 'addEventListener');

            // When
            instance.init();

            // Then
            expect(addEventListenerSpy).toHaveBeenCalledWith('message', expect.any(Function));
            expect(instance.initialized).toBe(true);
            expect(instance.messageEventRegistered).toBe(true);
        });

        it('should not register the message listener twice', function () {
            // Given
            instance.messageEventRegistered = true;
            const addEventListenerSpy = vi.spyOn(globalThis, 'addEventListener');

            // When
            instance.init();

            // Then
            expect(addEventListenerSpy).not.toHaveBeenCalled();
        });

        it('should fill the settings and mask placeholders on init', function () {
            // When
            instance.init();

            // Then
            expect(document.getElementById('placeholder1')?.innerHTML).toContain('tc-touch-pointer-settings');
            expect(document.getElementById('placeholder2')?.innerHTML).toContain('tc-touch-pointer-mask');
        });

        it('should clear the placeholders and mark itself uninitialized on unload', function () {
            // Given
            instance.init();

            // When
            instance.unload();

            // Then
            expect(document.getElementById('placeholder1')?.innerHTML).toBe('');
            expect(document.getElementById('placeholder2')?.innerHTML).toBe('');
            expect(instance.initialized).toBe(false);
        });
    });

    describe('_addArea() / _removeArea()', function () {
        it('should do nothing when the placeholder does not exist', function () {
            // Given
            document.getElementById('placeholder1')?.remove();

            // When / Then
            expect(() => instance._addSettingsArea()).not.toThrow();
            expect(() => instance._removeSettingsArea()).not.toThrow();
        });
    });

    describe('_addPointer() / _removePointer()', function () {
        it('should do nothing when there is no current slide', function () {
            // When / Then
            expect(() => instance._addPointer()).not.toThrow();
        });

        it('should log and do nothing on _removePointer when there is no current slide', function () {
            // Given
            const loggerSpy = vi.spyOn(logger, 'log').mockImplementation(() => {});

            // When
            instance._removePointer();

            // Then
            expect(loggerSpy).toHaveBeenCalledWith('no current slide nor shadowroot');
        });

        it('should do nothing when the current slide has no shadowRoot', function () {
            // Given
            const host = document.createElement('div');
            host.id = 'currentSlide';
            document.body.append(host);

            // When / Then
            expect(() => instance._addPointer()).not.toThrow();
            expect(() => instance._removePointer()).not.toThrow();
        });

        it('should style the slideViewFrame and append a pointer div when both exist', function () {
            // Given
            const { shadowRoot, frame } = buildCurrentSlide();

            // When
            instance._addPointer();

            // Then
            expect(frame.style.cursor).toBe('zoom-in');
            expect(shadowRoot.getElementById('pointer')).toBeTruthy();
        });

        it('should skip styling when slideViewFrame is missing', function () {
            // Given
            const host = document.createElement('div');
            host.id = 'currentSlide';
            document.body.append(host);
            const shadowRoot = host.attachShadow({ mode: 'open' });
            const section = document.createElement('div');
            section.id = 'slideViewSection';
            shadowRoot.append(section);

            // When / Then
            expect(() => instance._addPointer()).not.toThrow();
            expect(shadowRoot.getElementById('pointer')).toBeTruthy();
        });

        it('should skip appending a pointer when slideViewSection is missing', function () {
            // Given
            const host = document.createElement('div');
            host.id = 'currentSlide';
            document.body.append(host);
            const shadowRoot = host.attachShadow({ mode: 'open' });
            const frame = document.createElement('div');
            frame.id = 'slideViewFrame';
            shadowRoot.append(frame);

            // When
            instance._addPointer();

            // Then
            expect(shadowRoot.getElementById('pointer')).toBeNull();
        });

        it('should remove the pointer when it exists', function () {
            // Given
            const { shadowRoot } = buildCurrentSlide();
            instance._addPointer();
            expect(shadowRoot.getElementById('pointer')).toBeTruthy();

            // When
            instance._removePointer();

            // Then
            expect(shadowRoot.getElementById('pointer')).toBeNull();
        });

        it('should do nothing on remove when slideViewSection is missing', function () {
            // Given
            const host = document.createElement('div');
            host.id = 'currentSlide';
            document.body.append(host);
            host.attachShadow({ mode: 'open' });

            // When / Then
            expect(() => instance._removePointer()).not.toThrow();
        });

        it('should do nothing on remove when there is no pointer element', function () {
            // Given
            buildCurrentSlide();

            // When / Then
            expect(() => instance._removePointer()).not.toThrow();
        });
    });

    describe('_onMessageEvent()', function () {
        it('should ignore a message without data', function () {
            expect(() => instance._onMessageEvent(messageEvent(undefined))).not.toThrow();
        });

        it('should ignore a message whose data has no nested data object', function () {
            expect(() => instance._onMessageEvent(messageEvent({ type: 'pluginEventIn' }))).not.toThrow();
        });

        it('should ignore a message whose nested data is not an object', function () {
            expect(() => instance._onMessageEvent(messageEvent({ type: 'x', data: 'not-an-object' }))).not.toThrow();
        });

        it('should ignore messages of type "pluginEventIn"', function () {
            // Given
            const setPointerSpy = vi.spyOn(instance, '_setPointer');

            // When
            instance._onMessageEvent(messageEvent({ type: 'pluginEventIn', data: { type: 'pointerMove', payload: {} } }));

            // Then
            expect(setPointerSpy).not.toHaveBeenCalled();
        });

        it('should move the pointer with provided coordinates on "pointerMove"', function () {
            // Given
            const setPointerSpy = vi.spyOn(instance, '_setPointer');

            // When
            instance._onMessageEvent(messageEvent({ type: 'x', data: { type: 'pointerMove', payload: { x: '10%', y: '20%' } } }));

            // Then
            expect(setPointerSpy).toHaveBeenCalledWith('10%', '20%');
        });

        it('should default missing coordinates to "0" on "pointerMove"', function () {
            // Given
            const setPointerSpy = vi.spyOn(instance, '_setPointer');

            // When
            instance._onMessageEvent(messageEvent({ type: 'x', data: { type: 'pointerMove', payload: {} } }));

            // Then
            expect(setPointerSpy).toHaveBeenCalledWith('0', '0');
        });

        it('should change the pointer color on "pointerColor"', function () {
            // Given
            const setPointerColorSpy = vi.spyOn(instance, '_setPointerColor');

            // When
            instance._onMessageEvent(messageEvent({ type: 'x', data: { type: 'pointerColor', payload: { color: '#00FF00' } } }));

            // Then
            expect(setPointerColorSpy).toHaveBeenCalledWith('#00FF00');
        });

        it('should default a missing color to an empty string on "pointerColor"', function () {
            // Given
            const setPointerColorSpy = vi.spyOn(instance, '_setPointerColor');

            // When
            instance._onMessageEvent(messageEvent({ type: 'x', data: { type: 'pointerColor', payload: {} } }));

            // Then
            expect(setPointerColorSpy).toHaveBeenCalledWith('');
        });

        it('should forward the raw percentages to the zoom on "pointerClick"', function () {
            // Given la conversion en pixels se fait dans _toggleZoom, contre le repère du
            // frame et non celui de la fenêtre (#41).
            const toggleZoomSpy = vi.spyOn(instance, '_toggleZoom');

            // When
            instance._onMessageEvent(messageEvent({ type: 'x', data: { type: 'pointerClick', payload: { x: '50%', y: '20%' } } }));

            // Then
            expect(toggleZoomSpy).toHaveBeenCalledWith('50%', '20%');
        });

        it('should default missing coordinates to "0" on "pointerClick"', function () {
            // Given
            const toggleZoomSpy = vi.spyOn(instance, '_toggleZoom');

            // When
            instance._onMessageEvent(messageEvent({ type: 'x', data: { type: 'pointerClick', payload: {} } }));

            // Then
            expect(toggleZoomSpy).toHaveBeenCalledWith('0', '0');
        });
    });

    describe('_setPointer()', function () {
        it('should do nothing when there is no current slide', function () {
            expect(() => instance._setPointer('1', '2')).not.toThrow();
        });

        it('should do nothing when there is no pointer element', function () {
            // Given
            const host = document.createElement('div');
            host.id = 'currentSlide';
            document.body.append(host);
            host.attachShadow({ mode: 'open' });

            // When / Then
            expect(() => instance._setPointer('1', '2')).not.toThrow();
        });

        it('should move the pointer, make it visible and hide it again after a delay', function () {
            // Given
            vi.useFakeTimers();
            const { shadowRoot } = buildCurrentSlide();
            instance._addPointer();
            const pointer = shadowRoot.getElementById('pointer') as HTMLElement;

            // When
            instance._setPointer('42px', '84px');

            // Then
            expect(pointer.style.visibility).toBe('visible');
            expect(pointer.style.left).toBe('42px');
            expect(pointer.style.top).toBe('84px');
            expect(instance.pointer).toEqual({ x: '42px', y: '84px', color: '#FF0000' });

            // When time passes
            vi.advanceTimersByTime(2000);

            // Then
            expect(pointer.style.visibility).toBe('hidden');
            vi.useRealTimers();
        });

        it('should clear the previous hide-timer when moved again', function () {
            // Given
            vi.useFakeTimers();
            const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
            buildCurrentSlide();
            instance._addPointer();

            // When
            instance._setPointer('1px', '1px');
            instance._setPointer('2px', '2px');

            // Then
            expect(clearIntervalSpy).toHaveBeenCalled();
            vi.useRealTimers();
        });
    });

    describe('_setPointerColor()', function () {
        it('should do nothing when there is no current slide', function () {
            expect(() => instance._setPointerColor('#000000')).not.toThrow();
        });

        it('should do nothing when there is no pointer element', function () {
            // Given
            const host = document.createElement('div');
            host.id = 'currentSlide';
            document.body.append(host);
            host.attachShadow({ mode: 'open' });

            // When / Then
            expect(() => instance._setPointerColor('#000000')).not.toThrow();
        });

        it('should update the pointer background color', function () {
            // Given
            const { shadowRoot } = buildCurrentSlide();
            instance._addPointer();
            const pointer = shadowRoot.getElementById('pointer') as HTMLElement;

            // When
            instance._setPointerColor('rgb(1, 2, 3)');

            // Then
            expect(pointer.style.backgroundColor).toBe('rgb(1, 2, 3)');
            expect(instance.pointer.color).toBe('rgb(1, 2, 3)');
        });
    });

    describe('_toggleZoom()', function () {
        /** jsdom ne calcule aucun layout : il faut simuler la boîte du frame. */
        function giveFrameABox(frame: HTMLElement, width: number, height: number): void {
            vi.spyOn(frame, 'getBoundingClientRect').mockReturnValue({ width, height } as DOMRect);
        }

        it('should do nothing when there is no current slide', function () {
            expect(() => instance._toggleZoom('1%', '2%')).not.toThrow();
        });

        it('should do nothing when slideViewFrame is missing', function () {
            // Given
            const host = document.createElement('div');
            host.id = 'currentSlide';
            document.body.append(host);
            host.attachShadow({ mode: 'open' });

            // When / Then
            expect(() => instance._toggleZoom('1%', '2%')).not.toThrow();
        });

        it('should zoom in and flip the zooming flag when not zoomed', function () {
            // Given
            const { frame } = buildCurrentSlide();
            giveFrameABox(frame, 800, 600);

            // When un clic au centre du frame
            instance._toggleZoom('50%', '50%');

            // Then aucune translation nécessaire, seulement l'agrandissement
            expect(frame.style.transform).toBe('translateX(0px) translateY(0px) scale(2)');
            expect(frame.style.cursor).toBe('zoom-out');
            expect(instance.zooming).toBe(true);
        });

        it('should compute the translation in the frame reference frame, not the window one', function () {
            // Given une fenêtre bien plus large que le frame : c'est la configuration de
            // la vue presenter, où le frame n'occupe que 3/5 de la largeur (#41).
            const { frame } = buildCurrentSlide();
            giveFrameABox(frame, 800, 600);
            vi.stubGlobal('innerWidth', 4000);
            vi.stubGlobal('innerHeight', 3000);

            // When
            instance._toggleZoom('25%', '25%');

            // Then t = 2 * (400 - 200) = 400, plafonné à (2 - 1) * 800 / 2 = 400
            //      t = 2 * (300 - 150) = 300, plafonné à (2 - 1) * 600 / 2 = 300
            expect(frame.style.transform).toBe('translateX(400px) translateY(300px) scale(2)');
            vi.unstubAllGlobals();
        });

        it('should never translate the frame off its own box, even on a corner click', function () {
            // Given
            const { frame } = buildCurrentSlide();
            giveFrameABox(frame, 800, 600);

            // When un clic dans le coin, qui demanderait 2 * 400 = 800 sans plafond
            instance._toggleZoom('0%', '0%');

            // Then plafonné au recouvrement : la slide reste visible (#41)
            expect(frame.style.transform).toBe('translateX(400px) translateY(300px) scale(2)');
        });

        it('should zoom out and flip the zooming flag when already zoomed', function () {
            // Given
            const { frame } = buildCurrentSlide();
            instance.zooming = true;

            // When
            instance._toggleZoom('0%', '0%');

            // Then
            expect(frame.style.cursor).toBe('zoom-in');
            expect(frame.style.transform).toBe('translate3D(0px, 0px, 0px)');
            expect(instance.zooming).toBe(false);
        });
    });

    describe('_convertPercentToCoordinates()', function () {
        it('should convert a percentage string into a pixel coordinate for the given size', function () {
            expect(instance._convertPercentToCoordinates('50%', 200)).toBe(100);
        });
    });
});
