import { TCComponentLoaderComponent } from '@client/web-components/loader/loader-tc-component';

describe('TCComponentLoaderComponent', function () {
    let host: { showSuccess: ReturnType<typeof vi.fn>; showError: ReturnType<typeof vi.fn> };
    let wrapper: TCComponentLoaderComponent;

    beforeEach(function () {
        host = { showSuccess: vi.fn(), showError: vi.fn() };
        wrapper = new TCComponentLoaderComponent(host as ConstructorParameters<typeof TCComponentLoaderComponent>[0]);
    });

    describe('init()', function () {
        it('should call host.showSuccess()', function () {
            // When
            wrapper.init();
            // Then
            expect(host.showSuccess).toHaveBeenCalled();
        });
    });

    describe('error()', function () {
        it('should call host.showError()', function () {
            // When
            wrapper.error();
            // Then
            expect(host.showError).toHaveBeenCalled();
        });
    });
});
