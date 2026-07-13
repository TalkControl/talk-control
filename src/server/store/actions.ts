import type { Slide } from '@event-bus/slide';

export const ACTIONS = {
    INIT: 'INIT',
    GOTO_SLIDE: 'GOTO_SLIDE'
} as const;

export interface InitData {
    currentSlide: Partial<Slide>;
    slides: Slide[];
}

export type TcAction = { type: typeof ACTIONS.INIT; data: InitData } | { type: typeof ACTIONS.GOTO_SLIDE; data: Partial<Slide> };

export const init = (data: InitData): TcAction => ({ type: ACTIONS.INIT, data });
export const gotoSlide = (slide: Partial<Slide>): TcAction => ({ type: ACTIONS.GOTO_SLIDE, data: slide });
