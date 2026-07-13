import { EngineResolver } from '@client/engines/engine-resolver';
import { RevealEngine } from '@client/engines/revealjs-client-engine';
import { GenericEngine } from '@client/engines/generic-client-engine';

describe('EngineResolver (client)', function () {
    describe('getEngine()', function () {
        it('should return a RevealEngine for "revealjs"', function () {
            // When
            const engine = EngineResolver.getEngine('revealjs');
            // Then
            expect(engine).toBeInstanceOf(RevealEngine);
        });

        it('should return a GenericEngine for an unknown engine name (default branch)', function () {
            // When
            const engine = EngineResolver.getEngine('unknownEngine');
            // Then
            expect(engine).toBeInstanceOf(GenericEngine);
            expect(engine).not.toBeInstanceOf(RevealEngine);
        });
    });
});
