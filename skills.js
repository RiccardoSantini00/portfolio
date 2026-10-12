/*
  skills.js — single source for competences, sub-skills and software.

  Loaded in <head> by the Home and by every service page, before support.js.
  It only defines window.RS_SKILLS; the pages read it in renderVals():

    RS_SKILLS.competences  [{ name, service, subs: [...] }]  in display order
    RS_SKILLS.software     [name, ...]                       around the lens ring
    RS_SKILLS.forService(service)  competences of one service ('fotografia' | 'video' | 'social')
    RS_SKILLS.subsOf(service)      all sub-skills of a service, flattened and de-duplicated

  Edit the wording here and it changes on every page.
*/
(() => {
  const competences = [
    { name: 'Fotografia', service: 'fotografia', subs: ['Scatto', 'Composizione', 'Gestione della luce'] },
    { name: 'Photo Editing & Retouching', service: 'fotografia', subs: ['Sviluppo RAW', 'Correzione colore', 'Ritocco fotografico'] },
    { name: 'Video Production', service: 'video', subs: ['Riprese', 'Gestione della camera', 'Illuminazione', 'Audio'] },
    { name: 'Video Editing & Post‑Production', service: 'video', subs: ['Montaggio', 'Color correction', 'Color grading', 'Audio'] },
    { name: 'Motion Graphics', service: 'video', subs: ['Titoli animati', 'Grafiche', 'Animazioni', 'Effetti visivi'] },
    { name: 'Social Content Creation', service: 'social', subs: ['Reel', 'Video verticali', 'Contenuti per ogni piattaforma'] },
    { name: 'AI Content Generation', service: 'social', subs: ['Generazione di contenuti con AI', 'Integrazione di contenuti AI'] }
  ];
  const software = ['Premiere Pro', 'After Effects', 'Audition', 'DaVinci Resolve', 'Photoshop', 'Lightroom', 'Figma'];

  const forService = service => competences.filter(c => c.service === service);
  const subsOf = service => [...new Set(forService(service).flatMap(c => c.subs))];

  window.RS_SKILLS = { competences, software, forService, subsOf };
})();
