export function formatTime(time: number): string | number {
    return time ? (time < 10 ? '0' + time : time) : '00';
}
