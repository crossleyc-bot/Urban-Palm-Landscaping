import { createContext, useContext, useState, useEffect } from 'react';
import { apiGet } from '../api';

const SiteSettingsContext = createContext({});

const PAGE_KEYS = [
  { key: 'page_services', label: 'Services', path: '/services' },
  { key: 'page_products', label: 'Products', path: '/products' },
  { key: 'page_portfolio', label: 'Portfolio', path: '/portfolio' },
  { key: 'page_resources', label: 'Resources', path: '/resources' },
  { key: 'page_about', label: 'About', path: '/about' },
  { key: 'page_careers', label: 'Careers', path: '/careers' },
  { key: 'page_contact', label: 'Contact', path: '/contact' },
];

export { PAGE_KEYS };

export function SiteSettingsProvider({ children }) {
  const [settings, setSettings] = useState({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    apiGet('/settings/public')
      .then(setSettings)
      .catch(() => {}) // gracefully handle errors — page visibility defaults to visible
      .finally(() => setLoaded(true));
  }, []);

  const isPageVisible = (path) => {
    const page = PAGE_KEYS.find(p => p.path === path);
    if (!page) return true;
    const val = settings[page.key];
    // Default to visible if no setting exists
    return val !== '0';
  };

  const refresh = () => {
    apiGet('/settings/public').then(setSettings).catch(() => {});
  };

  return (
    <SiteSettingsContext.Provider value={{ settings, loaded, isPageVisible, refresh }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
