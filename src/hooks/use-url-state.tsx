import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const useUrlState = (paramName: string, defaultValue: string = '') => {
  const navigate = useNavigate();
  const location = useLocation();
  const [value, setValue] = useState<string>(defaultValue);

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const paramValue = urlParams.get(paramName);
    if (paramValue) {
      setValue(paramValue);
    } else {
      setValue(defaultValue);
    }
  }, [location.search, paramName, defaultValue]);

  const updateValue = (newValue: string) => {
    setValue(newValue);
    const urlParams = new URLSearchParams(location.search);
    
    if (newValue && newValue !== defaultValue) {
      urlParams.set(paramName, newValue);
    } else {
      urlParams.delete(paramName);
    }

    const newSearch = urlParams.toString();
    const newUrl = `${location.pathname}${newSearch ? `?${newSearch}` : ''}`;
    
    navigate(newUrl, { replace: true });
  };

  return [value, updateValue] as const;
};