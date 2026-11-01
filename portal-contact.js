// Stesso numero dei collegamenti WhatsApp del sito Luigi Rosati.
// Config separata: il file config.js condiviso dal login rimane invariato.
export const coachWhatsApp='393887738648';
export function whatsappURL(text='Ciao Luigi, ti scrivo dalla mia app LR Studio.'){return `https://wa.me/${coachWhatsApp}?text=${encodeURIComponent(text)}`;}
