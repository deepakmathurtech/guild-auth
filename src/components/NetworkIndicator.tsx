import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export function NetworkIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-16 md:bottom-6 left-1/2 -translate-x-1/2 bg-amber-600 text-black px-4 py-2 rounded-full shadow-lg flex items-center space-x-2 text-sm z-50 font-bold">
      <WifiOff size={16} />
      <span>Offline Mode - Pending Sync</span>
    </div>
  );
}
