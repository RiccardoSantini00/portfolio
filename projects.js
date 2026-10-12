/*
  projects.js — single source for the portfolio projects.

  Loaded in <head> before support.js by the Home (card carousel) and, later,
  by Progetti.dc.html (full project pages). It only defines window.RS_PROJECTS:

    RS_PROJECTS = [{ slug, name, role, cat, year, desc, media: [...] }]

  `slug` is the anchor on the projects page (Progetti.dc.html#slug).
  `media` holds 1–3 items shown as a mosaic on the card, the first one large:
    video('name')         assets/videos/name.mp4 with poster assets/posters/name.jpg
    photo('path', 'alt')  an image under assets/photos/

  To add a project, add one object to the list.
*/
(() => {
  const video = name => ({ kind: 'video', src: 'assets/videos/' + name + '.mp4', poster: 'assets/posters/' + name + '.jpg' });
  const photo = (path, alt) => ({ kind: 'photo', src: 'assets/photos/' + path, alt });

  window.RS_PROJECTS = [
    {
      slug: 'blinkoo', name: 'Blinkoo', role: 'Social media manager', cat: 'Social media', year: '2024 — 2025',
      desc: 'Gestione dei canali, produzione di reel e foto prodotto, pianificazione editoriale mensile.',
      media: [video('reel-theforkawards'), video('reel-uploads'), video('reel-milanogratis')]
    },
    {
      slug: 'ai-conf', name: 'AI Conf', role: 'Foto & video evento', cat: 'Eventi', year: '2026',
      desc: 'Copertura fotografica e video dell\'intera giornata: talk, networking, aftermovie.',
      media: [video('ai-conf-26'), video('ai-conf-reel'), video('reelanticipazione-aiconf2026')]
    },
    {
      slug: 'improove', name: 'Improove', role: 'Videomaking', cat: 'Brand video', year: '2025',
      desc: 'Ideazione e realizzazione di video brand e contenuti per il lancio del prodotto.',
      media: [video('videocreators')]
    }
  ];
})();
