import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DurationInputProps {
  value?: number; // Duration in minutes
  onChange: (minutes: number) => void;
  placeholder?: string;
  className?: string;
}

export const DurationInput: React.FC<DurationInputProps> = ({
  value = 10,
  onChange,
  placeholder = "Task duration",
  className
}) => {
  const [inputValue, setInputValue] = useState('');
  const [unit, setUnit] = useState<'minutes' | 'hours' | 'days'>('minutes');

  useEffect(() => {
    if (value) {
      if (value >= 1440) { // 24 hours or more
        setInputValue(Math.round(value / 1440).toString());
        setUnit('days');
      } else if (value >= 60) { // 1 hour or more
        setInputValue(Math.round(value / 60).toString());
        setUnit('hours');
      } else {
        setInputValue(value.toString());
        setUnit('minutes');
      }
    }
  }, [value]);

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    const numValue = parseInt(newValue) || 0;
    
    let minutes = 0;
    switch (unit) {
      case 'minutes':
        minutes = numValue;
        break;
      case 'hours':
        minutes = numValue * 60;
        break;
      case 'days':
        minutes = numValue * 1440;
        break;
    }
    
    onChange(Math.max(1, minutes)); // Minimum 1 minute
  };

  const handleUnitChange = (newUnit: 'minutes' | 'hours' | 'days') => {
    setUnit(newUnit);
    const numValue = parseInt(inputValue) || 0;
    
    let minutes = 0;
    switch (newUnit) {
      case 'minutes':
        minutes = numValue;
        break;
      case 'hours':
        minutes = numValue * 60;
        break;
      case 'days':
        minutes = numValue * 1440;
        break;
    }
    
    onChange(Math.max(1, minutes));
  };

  const quickSetDuration = (minutes: number) => {
    onChange(minutes);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex gap-2">
        <Input
          type="number"
          min="1"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1"
        />
        <Select value={unit} onValueChange={handleUnitChange}>
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="minutes">min</SelectItem>
            <SelectItem value="hours">hrs</SelectItem>
            <SelectItem value="days">days</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex gap-1 flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => quickSetDuration(15)}
          className="h-6 px-2 text-xs"
        >
          15min
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => quickSetDuration(30)}
          className="h-6 px-2 text-xs"
        >
          30min
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => quickSetDuration(60)}
          className="h-6 px-2 text-xs"
        >
          1hr
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => quickSetDuration(120)}
          className="h-6 px-2 text-xs"
        >
          2hrs
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => quickSetDuration(480)}
          className="h-6 px-2 text-xs"
        >
          1 day
        </Button>
      </div>
    </div>
  );
};