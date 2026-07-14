import config from '@config/config.json';
import { logger } from '@services/logger';
import { ACTIONS, TcAction } from './actions';
import type { Slide } from '@event-bus/slide';

export type { Slide };

export interface TcState {
    currentSlide: Partial<Slide>;
    slides: Slide[];
}

type Listener = (state: TcState) => void;

const initialState: TcState = {
    currentSlide: {},
    slides: []
};

export const reducers = (state: TcState = initialState, action: TcAction): TcState => {
    switch (action.type) {
        case ACTIONS.INIT:
            return { ...state, currentSlide: action.data.currentSlide, slides: action.data.slides };
        case ACTIONS.GOTO_SLIDE:
            return { ...state, currentSlide: action.data };
    }
    return state;
};

export function createTcStore(initial: TcState = initialState) {
    let state = initial;
    const listeners = new Set<Listener>();

    return {
        getState: (): TcState => state,
        dispatch(action: TcAction): void {
            state = reducers(state, action);
            if (config.logger.redux) logger.log(action.type, state);
            listeners.forEach(listener => listener(state));
        },
        subscribe(listener: Listener): () => void {
            listeners.add(listener);
            return () => listeners.delete(listener);
        }
    };
}

export type TcStore = ReturnType<typeof createTcStore>;
