import { useState, useEffect } from 'react';
import { getImageAspectRatio } from '@/lib/utils';

export const useImageAspectRatio = (url: string, fallbackRatio: number = 1) => {
  const [aspectRatio, setAspectRatio] = useState<number>(fallbackRatio);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!url) {
      setAspectRatio(fallbackRatio);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    getImageAspectRatio(url)
      .then(setAspectRatio)
      .catch(() => setAspectRatio(fallbackRatio))
      .finally(() => setIsLoading(false));
  }, [url, fallbackRatio]);

  return { aspectRatio, isLoading };
}; 