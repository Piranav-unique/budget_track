import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface SliderProps {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max: number;
    step?: number;
    label?: string;
    gradient?: [string, string];
    className?: string;
    showInput?: boolean;
    formatValue?: (value: number) => string;
    helperText?: string;
    error?: string;
}

export default function Slider({
    value,
    onChange,
    min = 0,
    max,
    step = 100,
    label,
    gradient = ["#10b981", "#06b6d4"],
    className,
    showInput = true,
    formatValue = (v) => `₹${v.toLocaleString()}`,
    helperText,
    error,
}: SliderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [localValue, setLocalValue] = useState(value.toString());
    const sliderRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setLocalValue(value === 0 ? "" : value.toString());
    }, [value]);

    const percentage = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

    const handleSliderClick = (e: React.MouseEvent<HTMLDivElement>) => {
        updateValueFromPosition(e.clientX);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        updateValueFromPosition(e.clientX);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (isDragging) {
            updateValueFromPosition(e.clientX);
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging]);

    const updateValueFromPosition = (clientX: number) => {
        if (!sliderRef.current) return;

        const rect = sliderRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
        const percentage = x / rect.width;
        let newValue = min + percentage * (max - min);

        // Snap to step
        newValue = Math.round(newValue / step) * step;
        newValue = Math.max(min, Math.min(max, newValue));

        onChange(newValue);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;
        setLocalValue(inputValue);

        const numValue = inputValue === "" ? 0 : parseFloat(inputValue) || 0;
        onChange(Math.max(min, Math.min(max, numValue)));
    };

    const gradientId = `slider-gradient-${Math.random().toString(36).substr(2, 9)}`;

    return (
        <div className={cn("space-y-3", className)}>
            {label && (
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground">{label}</label>
                    <span className="text-sm font-bold text-foreground tabular-nums">
                        {formatValue(value)}
                    </span>
                </div>
            )}

            {/* Slider Track */}
            <div className="relative">
                <div
                    ref={sliderRef}
                    className="relative h-3 bg-muted rounded-full cursor-pointer group"
                    onClick={handleSliderClick}
                >
                    <svg className="absolute inset-0 w-full h-full" style={{ overflow: 'visible' }}>
                        <defs>
                            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor={gradient[0]} />
                                <stop offset="100%" stopColor={gradient[1]} />
                            </linearGradient>
                        </defs>

                        {/* Filled portion */}
                        <rect
                            x="0"
                            y="0"
                            width={`${percentage}%`}
                            height="100%"
                            rx="6"
                            fill={`url(#${gradientId})`}
                            className="transition-all duration-200"
                        />
                    </svg>

                    {/* Thumb */}
                    <div
                        className={cn(
                            "absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full shadow-lg transition-all duration-200 cursor-grab active:cursor-grabbing",
                            isDragging ? "scale-125 shadow-xl" : "group-hover:scale-110"
                        )}
                        style={{
                            left: `calc(${percentage}% - 12px)`,
                            background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
                        }}
                        onMouseDown={handleMouseDown}
                    >
                        {/* Inner glow effect */}
                        <div className="absolute inset-1 rounded-full bg-white/30" />
                    </div>

                    {/* Tooltip on hover */}
                    {isDragging && (
                        <div
                            className="absolute -top-10 bg-foreground text-background px-3 py-1 rounded-md text-sm font-medium shadow-lg"
                            style={{
                                left: `calc(${percentage}% - 20px)`,
                                transform: 'translateX(-50%)',
                            }}
                        >
                            {formatValue(value)}
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-foreground" />
                        </div>
                    )}
                </div>

                {/* Min/Max labels */}
                <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
                    <span>₹{min.toLocaleString()}</span>
                    <span>₹{max.toLocaleString()}</span>
                </div>
            </div>

            {/* Number Input (optional) */}
            {showInput && (
                <Input
                    type="number"
                    value={localValue}
                    onChange={handleInputChange}
                    step={step}
                    min={min}
                    max={max}
                    placeholder="Enter amount"
                    className={cn(
                        "text-right tabular-nums",
                        error && "border-red-500 focus:border-red-500 focus:ring-red-500"
                    )}
                />
            )}

            {/* Helper text or error */}
            {(helperText || error) && (
                <p className={cn(
                    "text-sm",
                    error ? "text-red-600" : "text-muted-foreground"
                )}>
                    {error || helperText}
                </p>
            )}
        </div>
    );
}
