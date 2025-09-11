import * as React from "react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { countryCodes, getCountryCodeForCountry } from "@/lib/country-codes";
import { useTenant } from "@/hooks/use-tenant";

interface PhoneData {
  countryCode: string;
  phoneNumber: string;
}

interface PhoneInputProps {
  value?: PhoneData | string;
  onChange?: (value: PhoneData) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  defaultCountryCode?: string;
}

export const PhoneInput = React.forwardRef<HTMLDivElement, PhoneInputProps>(
  ({ value, onChange, placeholder = "Enter phone number", className, disabled, defaultCountryCode, ...props }, ref) => {
    const { currentTenant } = useTenant();
    
    // Get default country code from tenant or prop
    const getInitialCountryCode = React.useCallback(() => {
      if (defaultCountryCode) return defaultCountryCode;
      if (currentTenant?.country) {
        return getCountryCodeForCountry(currentTenant.country);
      }
      return getCountryCodeForCountry('');
    }, [currentTenant?.country, defaultCountryCode]);

    // Parse value into country code and phone number
    const parseValue = React.useCallback((val: PhoneData | string | undefined) => {
      if (!val) {
        return { countryCode: getInitialCountryCode(), phoneNumber: "" };
      }
      
      if (typeof val === 'object') {
        return {
          countryCode: val.countryCode || getInitialCountryCode(),
          phoneNumber: val.phoneNumber || ""
        };
      }
      
      // Legacy string format - parse it
      const foundCode = countryCodes.find(cc => val.startsWith(cc.code));
      if (foundCode) {
        return {
          countryCode: foundCode.code,
          phoneNumber: val.substring(foundCode.code.length).trim()
        };
      }
      
      return { countryCode: getInitialCountryCode(), phoneNumber: val };
    }, [getInitialCountryCode]);

    const initialValue = parseValue(value);
    const [countryCode, setCountryCode] = React.useState(initialValue.countryCode);
    const [phoneNumber, setPhoneNumber] = React.useState(initialValue.phoneNumber);

    // Update when value prop changes
    React.useEffect(() => {
      const newValue = parseValue(value);
      setCountryCode(newValue.countryCode);
      setPhoneNumber(newValue.phoneNumber);
    }, [value, parseValue]);

    const handleCountryCodeChange = (newCountryCode: string) => {
      setCountryCode(newCountryCode);
      onChange?.({ countryCode: newCountryCode, phoneNumber });
    };

    const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newPhoneNumber = e.target.value;
      setPhoneNumber(newPhoneNumber);
      onChange?.({ countryCode, phoneNumber: newPhoneNumber });
    };

    return (
      <div ref={ref} className={cn("flex", className)} {...props}>
        <Select value={countryCode} onValueChange={handleCountryCodeChange} disabled={disabled}>
          <SelectTrigger className="w-[120px] rounded-r-none border-r-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-[200px] bg-background border shadow-lg z-50">
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
          value={phoneNumber}
          onChange={handlePhoneNumberChange}
          placeholder={placeholder}
          className="rounded-l-none flex-1"
          disabled={disabled}
        />
      </div>
    );
  }
);

PhoneInput.displayName = "PhoneInput";