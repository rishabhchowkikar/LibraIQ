'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

type VTDoc = Document & {
    startViewTransition?: (cb: () => void) => { ready: Promise<void> };
};

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    if (!mounted) {
        return <div className="w-9 h-9 rounded-lg border" />;
    }

    const isDark = theme === 'dark';

    const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
        const nextTheme = isDark ? 'light' : 'dark';
        const rect = e.currentTarget.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        // Position expressed as a % of the viewport, not raw px — clip-path on
        // ::view-transition-new(root) doesn't reliably line up with
        // getBoundingClientRect()/clientX/Y in px once browser zoom isn't 100%,
        // but percentages resolve against the pseudo-element's own box, so they
        // stay correct at any zoom level or screen size.
        const xPercent = (x / window.innerWidth) * 100;
        const yPercent = (y / window.innerHeight) * 100;

        const doc = document as VTDoc;

        if (!doc.startViewTransition) {
            setTheme(nextTheme);
            return;
        }

        // Full diagonal — generously covers the farthest corner from any origin.
        const endRadius = Math.hypot(window.innerWidth, window.innerHeight);

        const transition = doc.startViewTransition(() => {
            setTheme(nextTheme);
        });

        transition.ready.then(() => {
            document.documentElement.animate(
                {
                    clipPath: [
                        `circle(0px at ${xPercent}% ${yPercent}%)`,
                        `circle(${endRadius}px at ${xPercent}% ${yPercent}%)`,
                    ],
                },
                {
                    duration: 480,
                    easing: 'ease-in-out',
                    pseudoElement: '::view-transition-new(root)',
                }
            );
        });
    };

    return (
        <Button
            variant="outline"
            size="icon"
            aria-label="Toggle theme"
            onClick={handleToggle}
            className="w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground"
        >
            {isDark ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
        </Button>
    );
}
