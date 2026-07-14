import { NotesTCComponent } from '@client/web-components/notes/notes-tc-component';

describe('NotesTCComponent', function () {
    describe('init()', function () {
        it('should subscribe to sendNotesToComponent and forward the data to host.addNotes', function () {
            // Given
            const host = { addNotes: vi.fn() };
            const wrapper = new NotesTCComponent(host);
            const onSpy = vi.spyOn(wrapper.controllerComponentChannel, 'on').mockImplementation(() => {});

            // When
            wrapper.init();
            const registeredCallback = onSpy.mock.calls[0][1];
            registeredCallback('some notes data');

            // Then
            expect(onSpy).toHaveBeenCalledWith('sendNotesToComponent', expect.any(Function));
            expect(host.addNotes).toHaveBeenCalledWith('some notes data');
        });
    });
});
