import * as React from "react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { countryCodes, getDefaultCountryCode } from "@/lib/country-codes";

interface PhoneInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const PhoneInput = React.forwardRef<HTMLDivElement, PhoneInputProps>(
  ({ value = "", onChange, placeholder = "Enter phone number", className, disabled, ...props }, ref) => {
    // Parse existing value to extract country code and number
    const parsePhoneValue = (phoneValue: string) => {
      if (!phoneValue) return { countryCode: getDefaultCountryCode(), number: "" };
      
      // Find matching country code
      const foundCode = countryCodes.find(cc => phoneValue.startsWith(cc.code));
      if (foundCode) {
        return {
          countryCode: foundCode.code,
          number: phoneValue.substring(foundCode.code.length).trim()
        };
      }
      
      // If no country code found, assume default and treat whole value as number
      return { countryCode: getDefaultCountryCode(), number: phoneValue };
    };

    const { countryCode: initialCountryCode, number: initialNumber } = parsePhoneValue(value);
    const [countryCode, setCountryCode] = React.useState(initialCountryCode);
    const [number, setNumber] = React.useState(initialNumber);

    // Update internal state when value prop changes
    React.useEffect(() => {
      const { countryCode: newCountryCode, number: newNumber } = parsePhoneValue(value);
      setCountryCode(newCountryCode);
      setNumber(newNumber);
    }, [value]);

    const handleCountryCodeChange = (newCountryCode: string) => {
      setCountryCode(newCountryCode);
      const fullPhoneNumber = number ? `${newCountryCode} ${number}` : newCountryCode;
      onChange?.(fullPhoneNumber);
    };

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newNumber = e.target.value;
      setNumber(newNumber);
      const fullPhoneNumber = newNumber ? `${countryCode} ${newNumber}` : "";
      onChange?.(fullPhoneNumber);
    };

    return (
      <div ref={ref} className={cn("flex", className)} {...props}>
        <Select value={countryCode} onValueChange={handleCountryCodeChange} disabled={disabled}>
          <SelectTrigger className="w-[120px] rounded-r-none border-r-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-[200px]">
            {countryCodes.map((country) => (
              <SelectItem key={country.code} value={country.code}>
                <span className="flex items-center gap-2">
                  <span>{country.flag}</span>
                  <span>{country.code}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="tel"
          value={number}
          onChange={handleNumberChange}
          placeholder={placeholder}
          className="rounded-l-none flex-1"
          disabled={disabled}
        />
      </div>
    );
  }
);

PhoneInput.displayName = "PhoneInput";