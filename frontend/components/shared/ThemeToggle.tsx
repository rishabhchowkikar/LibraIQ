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
        const x = e.clientX;
        const y = e.clientY;

        const doc = document as VTDoc;

        if (!doc.startViewTransition) {
            setTheme(nextTheme);
            return;
        }

        const endRadius = Math.hypot(
            Math.max(x, window.innerWidth - x),
            Math.max(y, window.innerHeight - y)
        );

        const transition = doc.startViewTransition(() => {
            setTheme(nextTheme);
        });

        transition.ready.then(() => {
            document.documentElement.animate(
                {
                    clipPath: [
                        `circle(0px at ${x}px ${y}px)`,
                        `circle(${endRadius}px at ${x}px ${y}px)`,
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
