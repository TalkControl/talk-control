/**
 * Géométrie du zoom du plugin touch-pointer, isolée du DOM pour être testable
 * sans layout (jsdom n'en calcule pas).
 *
 * Le zoom applique `translate(t) scale(s)` sur `#slideViewFrame`, dont le
 * `transform-origin` est le centre (valeur par défaut). Un point `p` exprimé
 * dans le repère LOCAL du frame (origine = coin haut-gauche du frame) se
 * retrouve donc en `c + s·(p − c) + t`, avec `c` le centre du frame.
 *
 * Pour amener le point cliqué au centre, on résout `c = c + s·(p − c) + t`,
 * d'où `t = s·(c − p)`.
 *
 * ⚠️ Le repère est celui du FRAME, pas celui de la fenêtre : c'était la cause
 * du bug #41. En vue presenter, le frame n'occupe que 3/5 de la largeur, et
 * calculer `t` à partir de `window.innerWidth` projetait la slide entièrement
 * hors de l'écran.
 */

export const ZOOM_SCALE = 2;

export interface Size {
    width: number;
    height: number;
}

export interface Point {
    x: number;
    y: number;
}

function clamp(value: number, bound: number): number {
    return Math.min(Math.max(value, -bound), bound);
}

/**
 * Translation à appliquer pour centrer `point` dans un frame de taille `box`
 * agrandi d'un facteur `scale`.
 *
 * Le résultat est plafonné pour que le frame agrandi recouvre toujours sa boîte
 * d'origine : au-delà de `(scale − 1)·taille / 2`, un bord se décollerait du
 * conteneur, laissant apparaître du vide (et débordant de l'autre côté).
 *
 * @param box - dimensions de mise en page du frame, en pixels
 * @param point - point à centrer, dans le repère local du frame, en pixels
 * @param scale - facteur d'agrandissement (1 = pas de zoom)
 * @returns translation en pixels à appliquer avant le `scale`
 */
export function computeZoomTransform(box: Size, point: Point, scale: number): Point {
    return {
        x: clamp(scale * (box.width / 2 - point.x), ((scale - 1) * box.width) / 2),
        y: clamp(scale * (box.height / 2 - point.y), ((scale - 1) * box.height) / 2)
    };
}
