interface Circle {
    x: number;
    y: number;
    size: number;
    color: string;
    opacity: number;
}

interface Stripe {
    angle: number;
    width: number;
    color: string;
    opacity: number;
}

export const generateBackground = () => {
    const circles = Array.from({ length: Math.floor(Math.random() * 4) + 1 }, () => ({
        x: Math.round(Math.random() * 100),
        y: Math.round(Math.random() * 100),
        size: Math.round(20 + Math.random() * 40),
        color: `hsla(${Math.round(Math.random() * 360)}, ${Math.round(40 + Math.random() * 30)}%, ${Math.round(70 + Math.random() * 20)}%, ${Math.round(0.1 + Math.random() * 100) / 100})`
    }));

    const stripes = Array.from({ length: Math.floor(Math.random() * 4) + 1 }, () => ({
        angle: Math.random() * 360,
        width: Math.round(5 + Math.random() * 15),
        color: `hsla(${Math.round(Math.random() * 360)}, ${Math.round(40 + Math.random() * 30)}%, ${Math.round(70 + Math.random() * 20)}%, ${Math.round(0.95 + Math.random() * 100) / 100})`
    }));

    return `${circles.map(circle =>
        `radial-gradient(circle ${circle.size}vw at ${circle.x}% ${circle.y}%, ${circle.color}, transparent ${circle.size}%)`
    ).join(', ')}${stripes.length ? ', ' : ''}${stripes.map(stripe =>
        `linear-gradient(${stripe.angle}deg, transparent, ${stripe.color} ${stripe.width}%, transparent ${stripe.width * 2}%)`
    ).join(', ')}`;
};