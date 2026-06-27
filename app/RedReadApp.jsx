import React, { useState } from 'react';

// ============================================================
// RedRead — App (étape 5)
// Feed + vue event + fiche article.
// La BARRE DE CLASSE remplace l'histogramme gauche/droite de Ground News.
// Données = analyses VALIDÉES (étape 4). Ici échantillon statique.
// Transposable en Expo : la structure d'écrans et de composants est la même,
// les <div> deviennent <View>, les styles passent en StyleSheet.
// ============================================================

const C = {
  rouge:'#FF1A1A', noir:'#050202', noir2:'#0E0808', noir3:'#1A1010',
  blanc:'#FAF0F0', gris:'#8A7C7C', line:'#2A1C1C',
  vert:'#1FBF75', jaune:'#E0A82E',
};

// ---- échantillon : 2 événements avec analyses validées ----
const EVENTS = [
  {
    id:'e1',
    title:"Itinérance au centre-ville : la couverture médiatique",
    region:'Montréal',
    n:5,
    classVec:{ capital:0.72, pb:0.20, prolo:0.08 },
    factuality:0.55,
    silence:true,
    silence_desc:"Aucun des cinq articles ne chiffre les coupes en santé mentale ni les profits immobiliers servis par le nettoyage sécuritaire de l'espace public.",
    cp:"La couverture transforme une crise du logement et des services sociaux en problème d'ordre public, ce qui sert les propriétaires fonciers au détriment des personnes sans logement.",
    pulse:"Les personnes itinérantes et les locataires menacés d'éviction, absents de presque toute la couverture.",
    articles:[
      {
        id:'a1', source:"Le Journal de Montréal", cls:'capital', clsLabel:"Capital industriel",
        title:"Des commerçants à bout de nerfs réclament plus de policiers",
        mobile:"Le Journal appartient à Québecor, dont les intérêts rejoignent ceux du capital immobilier et commercial du centre-ville. En cadrant l'itinérance comme un problème de sécurité, le texte protège la valeur foncière et détourne des causes économiques.",
        says:"Des commerçants se disent excédés et demandent une présence policière accrue. L'insécurité ressentie est présentée comme le problème central.",
        nd:{absent:["Aucun chiffre sur les coupes en santé mentale qui jettent des gens à la rue."],
            cache:["Les profits des promoteurs immobiliers.","La parole des personnes itinérantes, absente."],
            demi:["La pénurie de logements en une ligne en fin d'article.","« Le sentiment d'insécurité a augmenté » efface qui ressent et pourquoi."]},
        reading:"Le texte transforme une crise sociale en problème d'ordre. En donnant la parole aux commerçants et jamais aux personnes à la rue, il fait passer l'intérêt des propriétaires pour l'intérêt général. Vérifie toi-même : compte les sources, regarde qui parle.",
        fact:'mixte', sourcing:"Témoignages de commerçants, aucune donnée chiffrée. Reprise d'un cadrage, pas une enquête."
      },
      {
        id:'a2', source:"Pivot", cls:'prolo', clsLabel:"Prolétariat",
        title:"Itinérance : ce que cachent les appels au « nettoyage » du centre-ville",
        mobile:"Média coopératif financé par ses membres, sans propriétaire capitaliste. Relie l'itinérance aux coupes budgétaires et à la spéculation, ce que la presse de conglomérat tait.",
        says:"L'article relie la hausse de l'itinérance aux fermetures de ressources en santé mentale et à la crise du logement.",
        nd:{absent:[], cache:[], demi:["Cite des chiffres de fermetures sans toujours nommer la source exacte."]},
        reading:"Le texte sert le pouls des personnes touchées en nommant les causes matérielles : coupes et spéculation. Il déplace la question de l'ordre vers la répartition des richesses.",
        fact:'haute', sourcing:"Données de fermetures, entrevues avec des intervenants, source primaire."
      },
    ],
  },
  {
    id:'e2',
    title:"Grève à la STM : la bataille du récit",
    region:'Montréal',
    n:4,
    classVec:{ capital:0.55, pb:0.15, prolo:0.30 },
    factuality:0.70,
    silence:false,
    silence_desc:"",
    cp:"Le conflit oppose le coût du travail au profit : la sous-traitance que la direction présente comme une économie est un transfert du salaire vers le capital.",
    pulse:"Les chauffeurs grévistes, dont la parole apparaît surtout dans la presse coopérative.",
    articles:[
      {
        id:'a3', source:"TVA Nouvelles", cls:'capital', clsLabel:"Capital industriel",
        title:"Grève à la STM : les usagers pris en otage",
        mobile:"Propriété de Québecor. Le cadrage « usagers pris en otage » oppose les travailleurs au public et efface l'enjeu de la sous-traitance.",
        says:"L'article insiste sur les perturbations pour les usagers et la durée du débrayage.",
        nd:{absent:["Le contenu réel des revendications syndicales."],
            cache:["Les économies que la direction réalise sur le dos des salaires."],
            demi:["La sous-traitance mentionnée une fois, sans explication."]},
        reading:"En centrant les usagers contre les grévistes, le texte dresse une fraction des exploités contre une autre et masque qui profite de la sous-traitance.",
        fact:'mixte', sourcing:"Citations de la direction et d'usagers, aucune voix gréviste."
      },
      {
        id:'a4', source:"Pivot", cls:'prolo', clsLabel:"Prolétariat",
        title:"Les chauffeurs débrayent contre la sous-traitance",
        mobile:"Coopérative sans propriétaire capitaliste. Couvre la grève du point de vue des travailleurs.",
        says:"Les chauffeurs débrayent contre l'extension de la sous-traitance. Parole aux grévistes et au syndicat.",
        nd:{absent:[], cache:[], demi:["Les économies promises par la direction, citées sans être chiffrées."]},
        reading:"Le texte expose la sous-traitance comme transfert de richesse du salaire vers le profit. Vérifie : qui parle, quel intérêt est nommé.",
        fact:'haute', sourcing:"Paroles directes de grévistes, communiqué syndical, source primaire."
      },
    ],
  },
];

const clsColor = c => ({capital:C.vert, pb:C.jaune, prolo:C.rouge}[c]||C.gris);
const factLabel = v => v>=0.75?'haute':v>=0.5?'mixte':v>=0.25?'basse':'faible';

// ====================== BARRE DE CLASSE ======================
// Le coeur visuel : remplace l'histogramme gauche/centre/droite.
function ClassBar({ vec }){
  const seg = [
    {k:'capital', v:vec.capital, label:'Capital', col:C.vert},
    {k:'pb', v:vec.pb, label:'Petite bourgeoisie', col:C.jaune},
    {k:'prolo', v:vec.prolo, label:'Prolétariat', col:C.rouge},
  ];
  return (
    <div style={{margin:'14px 0'}}>
      <div style={{display:'flex',height:14,overflow:'hidden',border:`1px solid ${C.line}`}}>
        {seg.map(s=> s.v>0 && (
          <div key={s.k} style={{width:`${s.v*100}%`,background:s.col}} title={`${s.label} ${Math.round(s.v*100)}%`}/>
        ))}
      </div>
      <div style={{display:'flex',justifyContent:'space-between',marginTop:6,
        fontFamily:'monospace',fontSize:11,color:C.gris}}>
        {seg.map(s=>(
          <span key={s.k} style={{color:s.col}}>{s.label} {Math.round(s.v*100)}%</span>
        ))}
      </div>
    </div>
  );
}

// ====================== FEED ======================
function Feed({ onOpen }){
  return (
    <div>
      <div style={{fontFamily:'monospace',fontSize:12,color:C.gris,
        borderLeft:`2px solid ${C.line}`,paddingLeft:12,margin:'4px 0 20px'}}>
        Chaque événement, lu à travers la classe que sert sa couverture.
        Pas « gauche contre droite » : qui sert le capital, qui sert les masses.
      </div>
      {EVENTS.map(e=>(
        <div key={e.id} onClick={()=>onOpen(e)} style={{
          background:C.noir2,border:`1px solid ${C.line}`,padding:'18px 20px',
          marginBottom:16,cursor:'pointer'}}>
          <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:8}}>
            <span style={{fontFamily:'monospace',fontSize:11,color:C.gris}}>{e.region}</span>
            <span style={{fontFamily:'monospace',fontSize:11,color:C.gris}}>· {e.n} sources</span>
            {e.silence && (
              <span style={{fontFamily:'monospace',fontSize:10,color:C.rouge,
                border:`1px solid ${C.rouge}`,padding:'1px 7px',textTransform:'uppercase',letterSpacing:.5}}>
                Silence de classe
              </span>
            )}
          </div>
          <div style={{fontSize:18,fontWeight:600,lineHeight:1.35}}>{e.title}</div>
          <ClassBar vec={e.classVec}/>
          <div style={{fontFamily:'monospace',fontSize:11,color:C.gris}}>
            Fiabilité moyenne de la couverture : {factLabel(e.factuality)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ====================== VUE EVENT ======================
function EventView({ event, onBack, onOpenArticle }){
  return (
    <div>
      <BackBtn onBack={onBack} label="Tous les événements"/>
      <h2 style={{fontSize:22,fontWeight:700,lineHeight:1.3,margin:'8px 0'}}>{event.title}</h2>
      <ClassBar vec={event.classVec}/>

      {/* Contradiction principale, en accès libre, formulée clair */}
      <Section label="Ce que révèle la couverture">
        <p style={{fontSize:15,lineHeight:1.6}}>{event.cp}</p>
      </Section>

      {event.silence && (
        <div style={{background:C.noir3,border:`1px solid ${C.rouge}`,padding:'14px 16px',margin:'16px 0'}}>
          <div style={{fontFamily:'monospace',fontSize:11,color:C.rouge,textTransform:'uppercase',
            letterSpacing:1,marginBottom:8}}>Silence de classe</div>
          <p style={{fontSize:14,lineHeight:1.55}}>{event.silence_desc}</p>
        </div>
      )}

      <Section label="Le pouls étouffé">
        <p style={{fontSize:14,lineHeight:1.55,color:C.blanc}}>{event.pulse}</p>
      </Section>

      <Section label={`Les ${event.articles.length} articles, décortiqués`}>
        {event.articles.map(a=>(
          <div key={a.id} onClick={()=>onOpenArticle(a)} style={{
            display:'flex',alignItems:'center',gap:12,padding:'12px 0',
            borderBottom:`1px solid ${C.line}`,cursor:'pointer'}}>
            <span style={{width:4,alignSelf:'stretch',background:clsColor(a.cls),flexShrink:0}}/>
            <div style={{flex:1}}>
              <div style={{fontFamily:'monospace',fontSize:11,color:clsColor(a.cls)}}>{a.source} · {a.clsLabel}</div>
              <div style={{fontSize:14,fontWeight:500,lineHeight:1.4}}>{a.title}</div>
            </div>
            <span style={{color:C.gris}}>›</span>
          </div>
        ))}
      </Section>
    </div>
  );
}

// ====================== FICHE ARTICLE (le contre-rendu lisible) ======================
function ArticleView({ article, onBack }){
  const a = article;
  const ndBlock = (label, items) => items.length>0 && (
    <div style={{marginBottom:12}}>
      <div style={{fontFamily:'monospace',fontSize:10,color:C.gris,textTransform:'uppercase',marginBottom:5}}>{label}</div>
      {items.map((t,i)=><p key={i} style={{fontSize:14,lineHeight:1.5,marginBottom:5}}>— {t}</p>)}
    </div>
  );
  return (
    <div>
      <BackBtn onBack={onBack} label="Retour à l'événement"/>
      <div style={{fontFamily:'monospace',fontSize:11,color:clsColor(a.cls),margin:'8px 0 4px'}}>
        {a.source} · {a.clsLabel}
      </div>
      <h2 style={{fontSize:20,fontWeight:700,lineHeight:1.3,marginBottom:4}}>{a.title}</h2>

      <Section label="Pourquoi ce journal a publié ça">
        <p style={{fontSize:15,lineHeight:1.6}}>{a.mobile}</p>
      </Section>
      <Section label="Ce que le texte dit">
        <p style={{fontSize:14,lineHeight:1.55,color:C.gris}}>{a.says}</p>
      </Section>
      <Section label="Ce que le texte ne dit pas">
        {ndBlock('Absent', a.nd.absent)}
        {ndBlock('Caché', a.nd.cache)}
        {ndBlock('À demi dévoilé', a.nd.demi)}
        {a.nd.absent.length+a.nd.cache.length+a.nd.demi.length===0 &&
          <p style={{fontSize:14,color:C.gris}}>Rien d'important n'est omis.</p>}
      </Section>
      <Section label="Lecture de classe">
        <p style={{fontSize:15,lineHeight:1.6}}>{a.reading}</p>
      </Section>
      <Section label="Fiabilité">
        <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:8}}>
          <span style={{fontFamily:'monospace',fontSize:13,
            color:a.fact==='fausse'?C.noir:C.blanc,
            background:a.fact==='haute'?C.blanc:a.fact==='fausse'?C.gris:'transparent',
            border:`1px solid ${C.line}`,
            padding:'3px 10px',textTransform:'uppercase'}}>{a.fact}</span>
        </div>
        <p style={{fontSize:13,lineHeight:1.5,color:C.gris}}>{a.sourcing}</p>
      </Section>
    </div>
  );
}

// ---- petits composants ----
function Section({label, children}){
  return (
    <div style={{margin:'18px 0'}}>
      <div style={{fontFamily:'monospace',fontSize:11,color:C.rouge,textTransform:'uppercase',
        letterSpacing:1,marginBottom:8}}>{label}</div>
      {children}
    </div>
  );
}
function BackBtn({onBack, label}){
  return (
    <div onClick={onBack} style={{fontFamily:'monospace',fontSize:12,color:C.gris,
      cursor:'pointer',padding:'6px 0'}}>‹ {label}</div>
  );
}

// ====================== APP (navigation) ======================
export default function App(){
  const [event, setEvent] = useState(null);
  const [article, setArticle] = useState(null);

  return (
    <div style={{minHeight:'100vh',background:C.noir,color:C.blanc,
      fontFamily:'Inter, system-ui, sans-serif'}}>
      {/* en-tête */}
      <div style={{position:'sticky',top:0,zIndex:10,background:C.noir,
        borderBottom:`2px solid ${C.rouge}`,display:'flex',alignItems:'center',gap:12,padding:'14px 20px'}}>
        <div style={{width:28,height:28,borderRadius:'50%',position:'relative',
          background:`conic-gradient(from 135deg, ${C.blanc} 0deg 180deg, ${C.noir} 180deg 360deg)`,
          border:`1px solid ${C.line}`}}>
          <span style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-30%,-50%)',
            width:0,height:0,borderTop:'5px solid transparent',borderBottom:'5px solid transparent',
            borderLeft:`9px solid ${C.rouge}`}}/>
        </div>
        <div>
          <div style={{fontFamily:'"Bebas Neue", Impact, sans-serif',fontSize:24,letterSpacing:2,lineHeight:1}}>REDREAD</div>
          <div style={{fontFamily:'monospace',fontSize:10,color:C.gris,letterSpacing:1}}>LA PRESSE, LUE PAR CLASSE</div>
        </div>
      </div>

      <div style={{maxWidth:680,margin:'0 auto',padding:'20px'}}>
        {!event && !article && <Feed onOpen={e=>setEvent(e)}/>}
        {event && !article &&
          <EventView event={event} onBack={()=>setEvent(null)} onOpenArticle={a=>setArticle(a)}/>}
        {article &&
          <ArticleView article={article} onBack={()=>setArticle(null)}/>}
      </div>
    </div>
  );
}
