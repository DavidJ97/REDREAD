import React, { useState } from 'react';

// ============================================================
// REDREAD — Écran « Silence de classe » (étape 7) + bilingue FR/EN
// Le Blindspot inversé : pas « ce qu'un camp a manqué », mais ce que
// TOUTE la presse bourgeoise occulte. Données = events.is_class_silence.
// i18n : chaque texte est un objet {fr, en}, rendu selon la langue choisie.
// ============================================================

const C = {
  rouge:'#FF1A1A', noir:'#050202', noir2:'#0E0808', noir3:'#1A1010',
  blanc:'#FAF0F0', gris:'#8A7C7C', line:'#2A1C1C', vert:'#1FBF75', jaune:'#E0A82E',
};

// ---- chaînes d'interface bilingues ----
const T = {
  fr:{
    nav_feed:'Fil', nav_silence:'Silences', nav_about:'Méthode',
    title:'Silences de classe',
    intro:"Ce que toute la presse occulte d'un même geste. Pas l'angle qu'un camp a manqué : le fait qui dérange le capital, absent de gauche à droite.",
    covered_by:'sources concernées', all_silent:'toutes muettes sur',
    what_hidden:'Ce qui est tu', why:'À qui profite ce silence',
    empty:'Aucun silence détecté pour le moment. Le moteur en signalera au prochain cycle.',
    lang_btn:'EN',
  },
  en:{
    nav_feed:'Feed', nav_silence:'Silences', nav_about:'Method',
    title:'Class silences',
    intro:"What the entire press buries in one move. Not the angle one side missed: the fact that troubles capital, absent from left to right.",
    covered_by:'sources involved', all_silent:'all silent on',
    what_hidden:'What is buried', why:'Who benefits from this silence',
    empty:'No silence detected yet. The engine will flag some next cycle.',
    lang_btn:'FR',
  },
};

// ---- échantillon : events marqués silence de classe ----
const SILENCES = [
  {
    id:'s1', region:{fr:'Montréal',en:'Montreal'}, n:5,
    title:{
      fr:"Itinérance au centre-ville : la couverture médiatique",
      en:"Downtown homelessness: the media coverage",
    },
    hidden:{
      fr:"Aucun des cinq articles ne chiffre les coupes en santé mentale qui jettent des gens à la rue, ni les profits immobiliers servis par un « nettoyage » sécuritaire de l'espace public.",
      en:"None of the five articles quantifies the mental-health cuts pushing people onto the street, nor the real-estate profits served by a security-driven 'cleanup' of public space.",
    },
    why:{
      fr:"Nommer les coupes et la spéculation désignerait des responsables : l'État qui sabre et les promoteurs qui spéculent. Le silence protège les deux et laisse la police comme seule réponse.",
      en:"Naming the cuts and the speculation would point to those responsible: the state that slashes and the developers who speculate. The silence shields both and leaves police as the only answer.",
    },
  },
  {
    id:'s2', region:{fr:'Québec',en:'Quebec'}, n:6,
    title:{
      fr:"Pénurie de main-d'œuvre : le récit patronal",
      en:"Labour shortage: the employers' narrative",
    },
    hidden:{
      fr:"La couverture répète « pénurie de main-d'œuvre » sans jamais dire que les salaires offerts sont sous le seuil de subsistance dans les secteurs concernés. Le mot « bas salaires » n'apparaît nulle part.",
      en:"Coverage repeats 'labour shortage' without ever saying that the wages offered are below subsistence in the sectors involved. The phrase 'low wages' appears nowhere.",
    },
    why:{
      fr:"Parler de pénurie présente le manque comme un fait naturel, et non comme le refus patronal de payer un salaire décent. Le silence transforme une grève des bras invisibles en problème démographique.",
      en:"Framing it as a shortage presents the gap as natural fact, not as employers refusing a decent wage. The silence turns an invisible withdrawal of labour into a demographic problem.",
    },
  },
];

export default function SilenceScreen(){
  const [lang, setLang] = useState('fr');
  const t = T[lang];
  const tx = obj => obj[lang] || obj.fr;   // repli FR

  return (
    <div style={{minHeight:'100vh',background:C.noir,color:C.blanc,
      fontFamily:'Inter, system-ui, sans-serif'}}>

      {/* en-tête avec bascule de langue */}
      <div style={{position:'sticky',top:0,zIndex:10,background:C.noir,
        borderBottom:`2px solid ${C.rouge}`,display:'flex',alignItems:'center',
        justifyContent:'space-between',padding:'14px 20px'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:28,height:28,borderRadius:'50%',position:'relative',
            background:`conic-gradient(from 135deg, ${C.blanc} 0deg 180deg, ${C.noir} 180deg 360deg)`,
            border:`1px solid ${C.line}`}}>
            <span style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-30%,-50%)',
              width:0,height:0,borderTop:'5px solid transparent',borderBottom:'5px solid transparent',
              borderLeft:`9px solid ${C.rouge}`}}/>
          </div>
          <div style={{fontFamily:'"Bebas Neue", Impact, sans-serif',fontSize:24,letterSpacing:2}}>REDREAD</div>
        </div>
        <button onClick={()=>setLang(lang==='fr'?'en':'fr')} style={{
          fontFamily:'monospace',fontSize:12,color:C.gris,background:'transparent',
          border:`1px solid ${C.line}`,padding:'5px 12px',cursor:'pointer'}}>
          {t.lang_btn}
        </button>
      </div>

      {/* onglets (silence actif) */}
      <div style={{display:'flex',gap:0,borderBottom:`1px solid ${C.line}`,
        maxWidth:680,margin:'0 auto'}}>
        {[['nav_feed',false],['nav_silence',true],['nav_about',false]].map(([k,active])=>(
          <div key={k} style={{padding:'12px 18px',fontFamily:'monospace',fontSize:12,
            color:active?C.rouge:C.gris,borderBottom:active?`2px solid ${C.rouge}`:'2px solid transparent',
            cursor:'pointer'}}>{t[k]}</div>
        ))}
      </div>

      <div style={{maxWidth:680,margin:'0 auto',padding:20}}>
        <h2 style={{fontFamily:'"Bebas Neue", Impact, sans-serif',fontSize:30,
          letterSpacing:1.5,marginBottom:10}}>{t.title}</h2>
        <p style={{fontSize:14,lineHeight:1.6,color:C.gris,
          borderLeft:`2px solid ${C.rouge}`,paddingLeft:14,marginBottom:24}}>{t.intro}</p>

        {SILENCES.length===0 && (
          <div style={{textAlign:'center',padding:'60px 20px',color:C.gris}}>{t.empty}</div>
        )}

        {SILENCES.map(s=>(
          <div key={s.id} style={{background:C.noir2,border:`1px solid ${C.rouge}`,
            marginBottom:20,overflow:'hidden'}}>
            {/* bandeau */}
            <div style={{background:C.noir3,padding:'10px 18px',display:'flex',
              alignItems:'center',gap:10,borderBottom:`1px solid ${C.line}`}}>
              <span style={{fontFamily:'monospace',fontSize:10,color:C.rouge,
                textTransform:'uppercase',letterSpacing:1,border:`1px solid ${C.rouge}`,
                padding:'2px 8px'}}>{t.nav_silence}</span>
              <span style={{fontFamily:'monospace',fontSize:11,color:C.gris}}>
                {tx(s.region)} · {s.n} {t.all_silent}
              </span>
            </div>

            <div style={{padding:'16px 18px'}}>
              <div style={{fontSize:17,fontWeight:600,lineHeight:1.35,marginBottom:14}}>{tx(s.title)}</div>

              <div style={{marginBottom:14}}>
                <div style={{fontFamily:'monospace',fontSize:11,color:C.rouge,
                  textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>{t.what_hidden}</div>
                <p style={{fontSize:14,lineHeight:1.6}}>{tx(s.hidden)}</p>
              </div>

              <div>
                <div style={{fontFamily:'monospace',fontSize:11,color:C.rouge,
                  textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>{t.why}</div>
                <p style={{fontSize:14,lineHeight:1.6,color:C.blanc}}>{tx(s.why)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
