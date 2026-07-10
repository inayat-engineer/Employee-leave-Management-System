import { MoonStar, SunMedium } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { Button } from './Button';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button type="button" variant="secondary" onClick={toggleTheme} className="gap-2">
      {theme === 'dark' ? <SunMedium size={18} /> : <MoonStar size={18} />}
      <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
    </Button>
  );
}