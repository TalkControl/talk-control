/// <reference types="vite/client" />

declare module 'query-selector-shadow-dom' {
    export function querySelectorAllDeep(selector: string, root?: Element | Document): Element[];
    export function querySelectorDeep(selector: string, root?: Element | Document): Element | null;
}

interface RevealApi {
    configure(options?: Record<string, unknown>): void;
    slide(horizontalIndex?: number, verticalIndex?: number, fragmentIndex?: number): void;
    getSlideNotes(slide?: HTMLElement): string | null;
    getCurrentSlide(): HTMLElement;
    getSlides(): HTMLElement[];
    getIndices(slide?: HTMLElement): { h: number; v: number; f: number };
    next(): void;
    up(): void;
    down(): void;
    left(): void;
    right(): void;
    addEventListener(...args: unknown[]): void;
}

interface Window {
    Reveal: RevealApi;
}

declare module 'redux-logger';
