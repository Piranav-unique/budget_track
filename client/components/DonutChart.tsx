import { useState } from "react";
import { cn } from "@/lib/utils";

interface DonutChartProps {
    data: {
        label: string;
        value: number;
        color: string;
        gradient: [string, string];
    }[];
    size?: number;
    thickness?: number;
    className?: string;
}

export default function DonutChart({
    data,
    size = 240,
    thickness = 40,
    className
}: DonutChartProps) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    const total = data.reduce((sum, item) => sum + item.value, 0);
    const center = size / 2;
    const radius = (size - thickness) / 2;
    const circumference = 2 * Math.PI * radius;

    let currentAngle = -90; // Start from top

    const segments = data.map((item, index) => {
        const percentage = total > 0 ? (item.value / total) * 100 : 0;
        const angle = (percentage / 100) * 360;
        const startAngle = currentAngle;
        const endAngle = currentAngle + angle;

        // Calculate arc path
        const start = polarToCartesian(center, center, radius, startAngle);
        const end = polarToCartesian(center, center, radius, endAngle);
        const largeArcFlag = angle > 180 ? 1 : 0;

        const outerRadius = radius;
        const innerRadius = radius - thickness;

        const outerStart = polarToCartesian(center, center, outerRadius, startAngle);
        const outerEnd = polarToCartesian(center, center, outerRadius, endAngle);
        const innerStart = polarToCartesian(center, center, innerRadius, startAngle);
        const innerEnd = polarToCartesian(center, center, innerRadius, endAngle);

        const path = [
            `M ${outerStart.x} ${outerStart.y}`,
            `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
            `L ${innerEnd.x} ${innerEnd.y}`,
            `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}`,
            'Z'
        ].join(' ');

        currentAngle = endAngle;

        return {
            ...item,
            percentage,
            path,
            angle: (startAngle + endAngle) / 2,
        };
    });

    function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
        const radians = (angle * Math.PI) / 180;
        return {
            x: cx + r * Math.cos(radians),
            y: cy + r * Math.sin(radians),
        };
    }

    return (
        <div className={cn("relative inline-block", className)}>
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className="transform -rotate-0"
            >
                <defs>
                    {segments.map((segment, index) => (
                        <linearGradient
                            key={`gradient-${index}`}
                            id={`gradient-${index}`}
                            x1="0%"
                            y1="0%"
                            x2="100%"
                            y2="100%"
                        >
                            <stop offset="0%" stopColor={segment.gradient[0]} />
                            <stop offset="100%" stopColor={segment.gradient[1]} />
                        </linearGradient>
                    ))}
                </defs>

                {segments.map((segment, index) => (
                    <g key={index}>
                        <path
                            d={segment.path}
                            fill={`url(#gradient-${index})`}
                            className={cn(
                                "transition-all duration-300 cursor-pointer",
                                hoveredIndex === index ? "opacity-100 filter drop-shadow-lg" : "opacity-90"
                            )}
                            style={{
                                transform: hoveredIndex === index ? 'scale(1.05)' : 'scale(1)',
                                transformOrigin: `${center}px ${center}px`,
                            }}
                            onMouseEnter={() => setHoveredIndex(index)}
                            onMouseLeave={() => setHoveredIndex(null)}
                        />
                    </g>
                ))}

                {/* Center circle for donut effect */}
                <circle
                    cx={center}
                    cy={center}
                    r={radius - thickness}
                    fill="hsl(var(--card))"
                    className="drop-shadow-sm"
                />

                {/* Center text */}
                <text
                    x={center}
                    y={center - 10}
                    textAnchor="middle"
                    className="text-2xl font-bold fill-foreground"
                >
                    ₹{total.toLocaleString()}
                </text>
                <text
                    x={center}
                    y={center + 15}
                    textAnchor="middle"
                    className="text-xs fill-muted-foreground"
                >
                    Total Income
                </text>
            </svg>

            {/* Legend with hover effects */}
            <div className="mt-6 space-y-3">
                {segments.map((segment, index) => (
                    <div
                        key={index}
                        className={cn(
                            "flex items-center justify-between p-3 rounded-lg transition-all duration-300 cursor-pointer",
                            hoveredIndex === index
                                ? "bg-muted/80 scale-105 shadow-md"
                                : "bg-muted/40 hover:bg-muted/60"
                        )}
                        onMouseEnter={() => setHoveredIndex(index)}
                        onMouseLeave={() => setHoveredIndex(null)}
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className="w-4 h-4 rounded-full shadow-sm"
                                style={{
                                    background: `linear-gradient(135deg, ${segment.gradient[0]}, ${segment.gradient[1]})`,
                                }}
                            />
                            <span className="font-medium text-sm text-foreground">
                                {segment.label}
                            </span>
                        </div>
                        <div className="text-right">
                            <div className="font-bold text-foreground">
                                ₹{segment.value.toLocaleString()}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {segment.percentage.toFixed(1)}%
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
