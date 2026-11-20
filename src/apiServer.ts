/**
 * Il server Node (server.ts, rotte /api/...) esiste solo quando l'app gira in locale
 * o su un hosting con Node. Su GitHub Pages il sito è solo statico: lì i dati
 * passano esclusivamente da Firestore e le chiamate /api vanno saltate.
 */
export const HAS_API_SERVER =
  typeof window !== 'undefined' && !window.location.hostname.endsWith('github.io');
