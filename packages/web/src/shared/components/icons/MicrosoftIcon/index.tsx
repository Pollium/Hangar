import type { SVGProps } from 'react';

export const MicrosoftIcon = (props: SVGProps<SVGSVGElement>) => {
    return (
        <svg viewBox='0 0 24 24' fill='currentColor' aria-hidden='true' {...props}>
            <rect x='2' y='2' width='9' height='9' />
            <rect x='13' y='2' width='9' height='9' />
            <rect x='2' y='13' width='9' height='9' />
            <rect x='13' y='13' width='9' height='9' />
        </svg>
    );
};
