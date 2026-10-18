import { useEffect } from 'react';

/** "<title> — Movie Mystery" while the component is mounted; restores the previous title after. */
export default function useDocumentTitle(title) {
  useEffect(() => {
    if (!title) return undefined;
    const previous = document.title;
    document.title = `${title} — Movie Mystery`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
