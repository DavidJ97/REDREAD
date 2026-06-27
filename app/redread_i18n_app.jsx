import React, { createContext, useContext, useState, useEffect } from 'react';
import { LANGS, PRIMARY, pickLang, dirOf, isValidLang } from '../engine/redread_langs.js';

// ============================================================
// REDREAD — i18n app (étape 9, couche interface)
// Branche les 19 langues sur l'UI : provider, sélecteur, RTL.
// - pickLang gère le contenu (analyses) avec repli FR.
// - UI strings ci-dessous = le chrome de l'app (boutons, labels).
// - RTL (ar, ur, fa) : la direction bascule au niveau racine.
// ============================================================

// ---- chaînes d'interface (le chrome), pas le contenu des analyses ----
// Volontairement réduit : FR complet, EN complet, le reste en repli FR
// jusqu'à traduction militante. Le repli évite tout vide.
const UI = {
  fr:{
    feed:'Fil', silences:'Silences', method:'Méthode',
    by_class:'La presse, lue par classe',
    sources:'sources', reliability:'Fiabilité de la couverture',
    why_published:'Pourquoi ce journal a publié ça',
    what_says:'Ce que le texte dit', what_hidden:'Ce que le texte ne dit pas',
    class_reading:'Lecture de classe', reliability_label:'Fiabilité',
    absent:'Absent', hidden:'Caché', half:'À demi dévoilé',
    silence_tag:'Silence de classe', who_benefits:'À qui profite ce silence',
    back_events:'Tous les événements', back_event:'Retour à l\u2019événement',
    nothing_hidden:'Rien d\u2019important n\u2019est omis.',
  },
  en:{
    feed:'Feed', silences:'Silences', method:'Method',
    by_class:'The press, read by class',
    sources:'sources', reliability:'Coverage reliability',
    why_published:'Why this outlet published this',
    what_says:'What the text says', what_hidden:'What the text leaves out',
    class_reading:'Class reading', reliability_label:'Reliability',
    absent:'Absent', hidden:'Hidden', half:'Half-revealed',
    silence_tag:'Class silence', who_benefits:'Who benefits from this silence',
    back_events:'All events', back_event:'Back to event',
    nothing_hidden:'Nothing important is omitted.',
  },
  // es, pt, it... : ajoutés par traduction militante. Repli FR en attendant.
};

function uiStrings(lang){
  return { ...UI.fr, ...(UI[lang] || {}) };   // repli FR clé par clé
}

// ---- contexte de langue ----
const LangCtx = createContext(null);
export const useLang = () => useContext(LangCtx);

export function LangProvider({ initial = PRIMARY, children }){
  const [lang, setLangState] = useState(isValidLang(initial) ? initial : PRIMARY);

  // applique la direction (RTL/LTR) au document racine
  useEffect(() => {
    const dir = dirOf(lang);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('dir', dir);
      document.documentElement.setAttribute('lang', lang);
    }
  }, [lang]);

  const setLang = code => { if (isValidLang(code)) setLangState(code); };

  const value = {
    lang,
    dir: dirOf(lang),
    setLang,
    t: uiStrings(lang),               // chaînes d'interface
    tx: (field) => pickLang(field, lang),  // contenu d'analyse, repli FR
  };
  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>;
}

// ---- sélecteur de langue (les 19, nom natif) ----
export function LangSelector(){
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const current = LANGS.find(l => l.code === lang);

  return (
    <div style={{ position:'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={S.trigger}>
        {current?.native || lang} ▾
      </button>
      {open && (
        <div style={S.menu}>
          {LANGS.map(l => (
            <div key={l.code}
              onClick={() => { setLang(l.code); setOpen(false); }}
              style={{ ...S.item, ...(l.code === lang ? S.itemOn : {}) }}>
              <span style={{ direction: l.dir }}>{l.native}</span>
              <span style={S.itemName}>{l.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const S = {
  trigger:{ fontFamily:'monospace', fontSize:12, color:'#8A7C7C', background:'transparent',
    border:'1px solid #2A1C1C', padding:'5px 12px', cursor:'pointer' },
  menu:{ position:'absolute', top:'110%', insetInlineEnd:0, background:'#0E0808',
    border:'1px solid #2A1C1C', minWidth:200, maxHeight:340, overflowY:'auto', zIndex:50 },
  item:{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12,
    padding:'9px 14px', cursor:'pointer', borderBottom:'1px solid #1A1010' },
  itemOn:{ background:'#1A1010' },
  itemName:{ fontFamily:'monospace', fontSize:10, color:'#8A7C7C' },
};
