'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
    value: number;
    onChange?: (value: number) => void;
    size?: number;
    readOnly?: boolean;
}

export function StarRating({ value, onChange, size = 20, readOnly = false }: StarRatingProps) {
    const [hovered, setHovered] = useState<number | null>(null);
    const interactive = !readOnly && !!onChange;
    const displayValue = hovered ?? value;

    return (
        <div className={`flex items-center gap-0.5 ${interactive ? 'cursor-pointer' : ''}`}>
            {[1, 2, 3, 4, 5].map((star) => (
                <Star
                    key={star}
                    style={{ width: size, height: size }}
                    className={`transition-colors ${star <= Math.round(displayValue)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'fill-none text-muted-foreground/40'
                        }`}
                    onMouseEnter={() => interactive && setHovered(star)}
                    onMouseLeave={() => interactive && setHovered(null)}
                    onClick={() => interactive && onChange?.(star)}
                />
            ))}
        </div>
    );
}
