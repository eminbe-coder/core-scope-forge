import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HighValueToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const HighValueToggle = ({ 
  checked, 
  onCheckedChange, 
  disabled = false, 
  size = 'md',
  showLabel = true,
  className 
}: HighValueToggleProps) => {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4', 
    lg: 'h-5 w-5'
  };

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <div className="relative">
        <Checkbox
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          className={cn(
            "border-amber-400 data-[state=checked]:bg-amber-500 data-[state=checked]:text-white",
            sizeClasses[size]
          )}
          id="high-value-toggle"
        />
        {checked && (
          <Star 
            className={cn(
              "absolute top-0 left-0 text-white pointer-events-none",
              sizeClasses[size]
            )} 
            fill="currentColor"
          />
        )}
      </div>
      {showLabel && (
        <Label 
          htmlFor="high-value-toggle" 
          className={cn(
            "text-sm font-medium cursor-pointer",
            checked && "text-amber-600"
          )}
        >
          High Value
        </Label>
      )}
    </div>
  );
};