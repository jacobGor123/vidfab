'use client';

import { Globe } from 'lucide-react';
import { usePathname } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import { routing } from '@/i18n/routing';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const LOCALES = [
  { code: 'en', label: 'English',  short: 'EN' },
  { code: 'zh', label: '中文',     short: '中文' },
  { code: 'ja', label: '日本語',   short: '日本語' },
  { code: 'de', label: 'Deutsch',  short: 'DE' },
] as const;

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();

  function handleLocaleChange(nextLocale: string) {
    // 先更新 NEXT_LOCALE cookie，再跳转，避免 middleware 按旧 cookie 重定向
    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
    const prefix = nextLocale === routing.defaultLocale ? '' : `/${nextLocale}`;
    window.location.href = `${prefix}${pathname || '/'}`;
  }

  const current = LOCALES.find(l => l.code === locale);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-sm hover:bg-primary/20 hover:text-white focus:bg-primary/20 focus:text-white"
          aria-label="Select language"
        >
          <Globe className="h-4 w-4" />
          <span>{current?.short ?? 'EN'}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-gray-900 border-gray-700">
        {LOCALES.map(({ code, label }) => (
          <DropdownMenuItem
            key={code}
            onClick={() => handleLocaleChange(code)}
            className={`cursor-pointer focus:bg-primary/20 focus:text-white hover:bg-primary/20 hover:text-white ${
              locale === code ? 'font-semibold text-white bg-primary/10' : 'text-gray-300'
            }`}
          >
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
