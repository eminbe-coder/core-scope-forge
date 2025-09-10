export interface CountryCode {
  code: string;
  country: string;
  flag: string;
}

export const countryCodes: CountryCode[] = [
  { code: '+1', country: 'United States/Canada', flag: '🇺🇸' },
  { code: '+44', country: 'United Kingdom', flag: '🇬🇧' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+39', country: 'Italy', flag: '🇮🇹' },
  { code: '+34', country: 'Spain', flag: '🇪🇸' },
  { code: '+31', country: 'Netherlands', flag: '🇳🇱' },
  { code: '+32', country: 'Belgium', flag: '🇧🇪' },
  { code: '+41', country: 'Switzerland', flag: '🇨🇭' },
  { code: '+43', country: 'Austria', flag: '🇦🇹' },
  { code: '+45', country: 'Denmark', flag: '🇩🇰' },
  { code: '+46', country: 'Sweden', flag: '🇸🇪' },
  { code: '+47', country: 'Norway', flag: '🇳🇴' },
  { code: '+358', country: 'Finland', flag: '🇫🇮' },
  { code: '+351', country: 'Portugal', flag: '🇵🇹' },
  { code: '+30', country: 'Greece', flag: '🇬🇷' },
  { code: '+48', country: 'Poland', flag: '🇵🇱' },
  { code: '+420', country: 'Czech Republic', flag: '🇨🇿' },
  { code: '+36', country: 'Hungary', flag: '🇭🇺' },
  { code: '+40', country: 'Romania', flag: '🇷🇴' },
  { code: '+86', country: 'China', flag: '🇨🇳' },
  { code: '+81', country: 'Japan', flag: '🇯🇵' },
  { code: '+82', country: 'South Korea', flag: '🇰🇷' },
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+64', country: 'New Zealand', flag: '🇳🇿' },
  { code: '+55', country: 'Brazil', flag: '🇧🇷' },
  { code: '+52', country: 'Mexico', flag: '🇲🇽' },
  { code: '+54', country: 'Argentina', flag: '🇦🇷' },
  { code: '+56', country: 'Chile', flag: '🇨🇱' },
  { code: '+27', country: 'South Africa', flag: '🇿🇦' },
  { code: '+20', country: 'Egypt', flag: '🇪🇬' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
  { code: '+60', country: 'Malaysia', flag: '🇲🇾' },
  { code: '+66', country: 'Thailand', flag: '🇹🇭' },
  { code: '+84', country: 'Vietnam', flag: '🇻🇳' },
  { code: '+63', country: 'Philippines', flag: '🇵🇭' },
  { code: '+62', country: 'Indonesia', flag: '🇮🇩' },
];

// Country name to phone code mapping
export const countryToPhoneCode: Record<string, string> = {
  'United States': '+1',
  'Canada': '+1', 
  'USA': '+1',
  'US': '+1',
  'United Kingdom': '+44',
  'UK': '+44',
  'Britain': '+44',
  'France': '+33',
  'Germany': '+49',
  'Italy': '+39',
  'Spain': '+34',
  'Netherlands': '+31',
  'Belgium': '+32',
  'Switzerland': '+41',
  'Austria': '+43',
  'Denmark': '+45',
  'Sweden': '+46',
  'Norway': '+47',
  'Finland': '+358',
  'Portugal': '+351',
  'Greece': '+30',
  'Poland': '+48',
  'Czech Republic': '+420',
  'Hungary': '+36',
  'Romania': '+40',
  'China': '+86',
  'Japan': '+81',
  'South Korea': '+82',
  'Korea': '+82',
  'India': '+91',
  'Australia': '+61',
  'New Zealand': '+64',
  'Brazil': '+55',
  'Mexico': '+52',
  'Argentina': '+54',
  'Chile': '+56',
  'South Africa': '+27',
  'Egypt': '+20',
  'UAE': '+971',
  'United Arab Emirates': '+971',
  'Saudi Arabia': '+966',
  'KSA': '+966',
  'Kuwait': '+965',
  'Qatar': '+974',
  'Bahrain': '+973',
  'Oman': '+968',
  'Singapore': '+65',
  'Malaysia': '+60',
  'Thailand': '+66',
  'Vietnam': '+84',
  'Philippines': '+63',
  'Indonesia': '+62',
};

export const getDefaultCountryCode = (): string => {
  return '+1'; // Default to US/Canada
};

// GCC countries for tenant settings
export const gccCountries: CountryCode[] = [
  { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+965', country: 'Kuwait', flag: '🇰🇼' },
  { code: '+974', country: 'Qatar', flag: '🇶🇦' },
  { code: '+973', country: 'Bahrain', flag: '🇧🇭' },
  { code: '+968', country: 'Oman', flag: '🇴🇲' },
];

export const getCountryCodeForCountry = (country: string): string => {
  if (!country) return getDefaultCountryCode();
  
  // Try exact match first
  const exactMatch = countryToPhoneCode[country];
  if (exactMatch) return exactMatch;
  
  // Try case-insensitive partial match
  const lowerCountry = country.toLowerCase();
  for (const [countryName, code] of Object.entries(countryToPhoneCode)) {
    if (countryName.toLowerCase().includes(lowerCountry) || lowerCountry.includes(countryName.toLowerCase())) {
      return code;
    }
  }
  
  return getDefaultCountryCode();
};