export function hsvToRgb(h: number, s: number, v: number) {
    let r = 0,
        g = 0,
        b = 0;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);

    switch (i % 6) {
        case 0:
            [r, g, b] = [v, t, p];
            break;
        case 1:
            [r, g, b] = [q, v, p];
            break;
        case 2:
            [r, g, b] = [p, v, t];
            break;
        case 3:
            [r, g, b] = [p, q, v];
            break;
        case 4:
            [r, g, b] = [t, p, v];
            break;
        case 5:
            [r, g, b] = [v, p, q];
            break;
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

export function generateDistinguishableColors(count: number, mod = 1) {
    return Array.from({ length: count }, (_, i) => {
        const hue = (i / count) * mod;
        const [r, g, b] = hsvToRgb(hue, 1, 0.75);
        return `rgb(${r}, ${g}, ${b})`;
    });
}
