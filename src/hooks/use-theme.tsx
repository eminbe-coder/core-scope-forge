import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'grey' | 'black' | 'white';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'grey',
  setTheme: () => {},
});

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>('grey');

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Remove all theme classes
    document.documentElement.classList.remove('theme-black', 'theme-white');
    
    // Add the appropriate theme class
    if (newTheme === 'black') {
      document.documentElement.classList.add('theme-black');
    } else if (newTheme === 'white') {
      document.documentElement.classList.add('theme-white');
    }
    // For 'grey' theme, we don't add any class as it's the default
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme && ['grey', 'black', 'white'].includes(savedTheme)) {
      setTheme(savedTheme);
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};