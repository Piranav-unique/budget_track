import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface CircularProgressProps {
    value: number; // 0-100
    max?: number;
    size?: number;
    strokeWidth?: number;
    label?: string;
    gradient?: [string, string];
    className?: string;
    showPercentage?: boolean;
}

export default function CircularProgress({
    value,
    max = 100,
    size = 120,
    strokeWidth = 8,
    label,
    gradient = ["#10b981", "#06b6d4"],
    className,
    showPercentage = true,
}: CircularProgressProps) {
    const [animatedValue, setAnimatedValue] = useState(0);

    const percentage = Math.min(100, Math.max(0, (value / max) * 100));
    const center = size / 2;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (animatedValue / 100) * circumference;

    useEffect(() => {
        // Animate on mount and value change
        const timer = setTimeout(() => {
            setAnimatedValue(percentage);
        }, 100);

        return () => clearTimeout(timer);
    }, [percentage]);

    const gradientId = `gradient-${Math.random().toString(36).substr(2, 9)}`;

    return (
        <div className={cn("relative inline-flex items-center justify-center", className)}>
            <svg
                width={size}
                height={size}
                className="transform -rotate-90"
            >
                <defs>
                    <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={gradient[0]} />
                        <stop offset="100%" stopColor={gradient[1]} />
                    </linearGradient>
                </defs>

                {/* Background circle */}
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth={strokeWidth}
                    className="opacity-30"
                />

                {/* Progress circle */}
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke={`url(#${gradientId})`}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                    style={{
                        filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))',
                    }}
                />
            </svg>

            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                {showPercentage && (
                    <div className="text-2xl font-bold text-foreground tabular-nums">
                        {Math.round(animatedValue)}%
                    </div>
                )}
                {label && (
                    <div className="text-xs text-muted-foreground mt-1 text-center px-2">
                        {label}
                    </div>
                )}
                {!showPercentage && value !== undefined && (
                    <div className="text-xl font-bold text-foreground">
                        ₹{value.toLocaleString()}
                    </div>
                )}
            </div>
        </div>
    );
}
