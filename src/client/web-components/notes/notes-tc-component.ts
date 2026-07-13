import { TCComponentWrapper } from '@event-bus/tc-component-wrapper';

interface NotesHost {
    addNotes(data: unknown): void;
}

export class NotesTCComponent extends TCComponentWrapper<NotesHost> {
    override init(): void {
        this.controllerComponentChannel.on('sendNotesToComponent', data => this.host.addNotes(data));
    }
}
