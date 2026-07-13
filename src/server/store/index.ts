import config from '@config/config.json';
import { createStore, applyMiddleware, Store } from 'redux';
import { createLogger } from 'redux-logger';
import { ACTIONS } from './actions';
import type { Slide } from '@event-bus/slide';

export type { Slide };

export interface TcState {
    currentSlide: Partial<Slide>;
    slides: Slide[];
}

type TcAction = { type: string; data?: unknown };

const initialState: TcState = {
    currentSlide: {},
    slides: []
};

// Les 2 casts ci-dessous restent en l'état (IMP-007) : TcAction.data est volontairement `unknown`,
// la discrimination stricte par action.type (Redux typé) est le périmètre de l'étape 12 — pas de
// cet event-bus.
export const reducers = (state: TcState = initialState, action: TcAction): TcState => {
    const { data } = action;
    switch (action.type) {
        case ACTIONS.INIT: {
            const initData = data as { currentSlide: Partial<Slide>; slides: Slide[] };
            return { ...state, currentSlide: initData.currentSlide, slides: initData.slides };
        }
        case ACTIONS.GOTO_SLIDE:
            return { ...state, currentSlide: data as Partial<Slide> };
    }
    return state;
};

export function createTcStore(): Store<TcState> {
    return createStore(reducers, initialState, config.logger.redux ? applyMiddleware(createLogger()) : undefined);
}
