-- ============================================================
-- REDREAD — SEED : 30 sources calibrees sur la grille de classe
-- A executer APRES redread_schema.sql
-- Colonnes : name, domain, country, lang, ownership, owner_entity,
--            class_default, factuality_base, funding_note, hand_coded_by
-- ============================================================
-- Principe demontre par ce seed : la presse bourgeoise « de gauche »
-- (La Presse, Le Devoir) et « de droite » (JdM, National Post) tombe
-- TOUTE dans capital_*. L'axe gauche/droite de Ground News s'effondre.
-- ============================================================

insert into sources (name, domain, country, lang, ownership, owner_entity, class_default, factuality_base, funding_note, hand_coded_by) values

-- ===== CONGLOMERATS QUEBECOIS / CANADIENS (capital) =====
('Le Journal de Montréal','journaldemontreal.com','CA','fr','conglomerat','Québecor (Pierre Karl Péladeau)','capital_industriel','mixte',
 'Filiale de Québecor, conglomérat télécom-média côté en bourse. Revenus pub + abonnés + synergies Vidéotron/TVA. PKP, ex-candidat PQ, capital concentré.','seed'),

('TVA Nouvelles','tvanouvelles.ca','CA','fr','conglomerat','Québecor (Pierre Karl Péladeau)','capital_industriel','mixte',
 'Bras télé de Québecor. Même propriété que le JdM. Pub + redevances câble.','seed'),

('La Presse','lapresse.ca','CA','fr','fondation','Fiducie sans but lucratif (legs Power Corporation)','capital_finance','haute',
 'Détenue par une fiducie depuis 2018, mais issue de Power Corporation (famille Desmarais, finance/assurance). Financement par dons + pub. Ligne « centre-gauche » respectable, intérêts du capital financier intacts.','seed'),

('Le Devoir','ledevoir.com','CA','fr','independant_precaire','Indépendant (structure OBNL/actions)','petite_bourgeoisie','haute',
 'Se présente comme indépendant. Lectorat intellectuel petit-bourgeois, nationaliste. Abonnements + dons. Étiqueté « gauche » mais ne conteste pas le rapport de production.','seed'),

('Le Soleil','lesoleil.com','CA','fr','cooperative','Coopérative nationale de l''information indépendante','petite_bourgeoisie','haute',
 'Passé en coopérative (CN2i) en 2019 après les quotidiens Capitales Médias. Financement coop + aide publique. Ligne régionale modérée.','seed'),

('National Post','nationalpost.com','CA','en','conglomerat','Postmedia Network','capital_finance','mixte',
 'Postmedia, lourdement endetté, contrôlé par des fonds américains (Chatham Asset Management). Ligne ouvertement pro-marché, « droite ». Capital financier US.','seed'),

('The Globe and Mail','theglobeandmail.com','CA','en','milliardaire','Woodbridge (famille Thomson)','capital_finance','haute',
 'Propriété de la famille Thomson (Thomson Reuters), l''une des plus grandes fortunes canadiennes. Journal d''affaires de référence du capital.','seed'),

-- ===== PRESSE D'ETAT BOURGEOISE =====
('Radio-Canada','ici.radio-canada.ca','CA','fr','etat_bourgeois','État fédéral canadien','petite_bourgeoisie','haute',
 'Diffuseur public fédéral, financé par crédits parlementaires + pub. Indépendance éditoriale réelle mais cadre étatique : ne sort jamais de l''horizon du capitalisme canadien.','seed'),

('CBC News','cbc.ca','CA','en','etat_bourgeois','État fédéral canadien','petite_bourgeoisie','haute',
 'Pendant anglophone de Radio-Canada. Même financement étatique, même cadre.','seed'),

('CTV News','ctvnews.ca','CA','en','conglomerat','Bell Media (BCE)','capital_industriel','mixte',
 'Propriété de Bell (BCE), géant télécom. Synergies avec le réseau Bell. Capital industriel/télécom.','seed'),

-- ===== AGENCES / INTERNATIONAL (capital) =====
('Agence France-Presse','afp.com','FR','fr','etat_bourgeois','Statut sui generis (proche État français)','petite_bourgeoisie','haute',
 'Agence semi-étatique française. Source primaire mondiale, factualité élevée, mais cadrage occidental structurel.','seed'),

('Reuters','reuters.com','GB','en','conglomerat','Thomson Reuters','capital_finance','haute',
 'Agence du groupe Thomson Reuters, orientée marchés financiers. Clientèle = traders, banques. Factuel, optique capital.','seed'),

('Bloomberg','bloomberg.com','US','en','milliardaire','Michael Bloomberg','capital_finance','haute',
 'Propriété personnelle de Michael Bloomberg, milliardaire. Média explicitement au service de la finance.','seed'),

('The Wall Street Journal','wsj.com','US','en','milliardaire','News Corp (Rupert Murdoch)','capital_finance','haute',
 'News Corp de Murdoch. Voix éditoriale du capital financier US, mur factuel haut mais éditorial pro-capital assumé.','seed'),

('CNN','cnn.com','US','en','conglomerat','Warner Bros. Discovery','capital_industriel','mixte',
 'Conglomérat média US. Libéralisme de marché, démocrate-business. « Gauche » au sens US, capital intact.','seed'),

('Fox News','foxnews.com','US','en','milliardaire','Fox Corporation (Murdoch)','capital_industriel','basse',
 'Murdoch. Division des masses sur lignes identitaires/raciales, factualité régulièrement basse sur le politique. Capital + fonction de division.','seed'),

-- ===== PRESSE MILITANTE / OUVRIERE =====
('Pivot','pivot.quebec','CA','fr','cooperative','Coopérative de solidarité Pivot','proletariat','haute',
 'Média coopératif québécois orienté justice sociale, écologie, luttes. Financement membres + dons. Proche des mouvements.','seed'),

('Ricochet','ricochet.media','CA','en','cooperative','Coopérative Ricochet Media','proletariat','haute',
 'Coop de journalisme indépendant, enquêtes sur le pouvoir et les luttes. Financement lecteurs.','seed'),

('The Breach','breachmedia.ca','CA','en','independant_precaire','OBNL indépendant','proletariat','haute',
 'Média de gauche anticapitaliste canadien, enquêtes sur le capital et le colonialisme. Dons + fondations progressistes.','seed'),

('Presse-toi à gauche','pressegauche.org','CA','fr','militant_syndical','Réseau militant / Québec solidaire mouvance','proletariat','mixte',
 'Webzine militant de la gauche québécoise. Bénévolat militant. Parti pris assumé, sourcing variable.','seed'),

('Jacobin','jacobin.com','US','en','independant_precaire','Bhaskar Sunkara / Jacobin Foundation','proletariat','mixte',
 'Revue socialiste US. Analyse de classe explicite. Abonnements + dons. Théorie forte, reportage primaire limité.','seed'),

('World Socialist Web Site','wsws.org','US','en','militant_syndical','Comité international de la IVe Internationale','proletariat','mixte',
 'Organe trotskyste (CIQI). Parti pris révolutionnaire ouvert. Ligne sectaire à signaler, factualité variable selon les dossiers.','seed'),

('Morning Star','morningstaronline.co.uk','GB','en','cooperative','People''s Press Printing Society (coopérative)','proletariat','mixte',
 'Quotidien socialiste britannique, propriété coopérative liée au mouvement ouvrier et syndical. Financement lecteurs + syndicats.','seed'),

-- ===== HAITI (terrain) =====
('Le Nouvelliste','lenouvelliste.com','HT','fr','milliardaire','Famille Chenet / capital haïtien','capital_industriel','mixte',
 'Plus vieux quotidien haïtien, propriété de la bourgeoisie compradore locale. Ligne respectable, intérêts des élites de Pétion-Ville.','seed'),

('AlterPresse','alterpresse.org','HT','fr','independant_precaire','Réseau alternatif (SAKS)','masses_populaires','haute',
 'Agence alternative haïtienne, proche des organisations populaires et paysannes. Financement ONG/solidarité. Voix des masses haïtiennes.','seed'),

('Haïti Liberté','haitiliberte.com','HT','fr','militant_syndical','Collectif militant haïtien (diaspora)','masses_populaires','mixte',
 'Hebdomadaire de gauche haïtien/diaspora, anti-impérialiste, créole/français/anglais. Parti pris assumé.','seed'),

-- ===== HISPANOPHONE (terrain) =====
('Telesur','telesurtv.net','VE','es','etat_bourgeois','États (Venezuela et alliés)','masses_populaires','mixte',
 'Chaîne financée par des États latino-américains de gauche. Contre-hégémonique vs médias US, mais ligne étatique : factualité à vérifier selon dossiers.','seed'),

('Página/12','pagina12.com.ar','AR','es','independant_precaire','Groupe indépendant argentin','proletariat','mixte',
 'Quotidien argentin de gauche, kirchnériste. Ligne péroniste/progressiste, parti pris assumé.','seed'),

('El País','elpais.com','ES','es','conglomerat','Grupo PRISA','capital_finance','haute',
 'Groupe PRISA, capital espagnol endetté (fonds, banques). Social-libéral, « gauche » de marché. Référence ibéro-américaine du centre bourgeois.','seed'),

-- ===== LE CAS META : Ground News lui-meme =====
('Ground News','ground.news','CA','en','capital_risque','Snapwise Inc. (VC-backed)','petite_bourgeoisie','mixte',
 'Agrégateur « anti-biais » financé par capital-risque. Vend la grille gauche/centre/droite bourgeoise comme neutralité. Le sujet même de RedRead.','seed');
