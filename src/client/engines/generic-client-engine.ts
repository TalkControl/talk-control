import type { Slide } from '@event-bus/slide';

export class GenericEngine {
    init(): void {}

    goToSlide(_params: unknown, _delta = 0): void {}

    getSlides(): Slide[] {
        return [];
    }

    getSlideNotes(): unknown {
        return null;
    }
}
