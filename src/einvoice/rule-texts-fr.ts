/*
 * French (France) wording for every rule the validator reports, as
 * [message, fix] pairs. Rule IDs follow rule-texts.ts, which stays the source
 * of severities and BT references; only the sentences live here, so the two
 * files must keep the same set of IDs.
 */

type Pair = [msg: string, fix: string];

// BR-DE-* rules only apply to German XRechnung; French readers need to see that up front.
const xr = (msg: string, fix: string): Pair => [`Règle XRechnung (Allemagne) : ${msg}`, fix];

const BASE: Record<string, Pair> = {
  Profile: ['Le profil (p. ex. MINIMUM, BASIC WL, ZUGFeRD 1.0) ne contient pas le jeu de données complet de la norme EN 16931.', 'Demander à l’émetteur une facture au profil EN 16931 (COMFORT) ou EXTENDED.'],
  IBAN: ['L’IBAN doit avoir une clé de contrôle valide, sinon le paiement ne peut pas parvenir au bénéficiaire.', 'Comparer l’IBAN avec le RIB ; le plus souvent, deux chiffres sont inversés.'],
  'BR-01': ['Chaque facture indique la spécification qu’elle applique (p. ex. EN 16931 ou un profil Factur-X).', 'Renseigner BT-24, p. ex. urn:cen.eu:en16931:2017 pour le profil EN 16931 de Factur-X.'],
  'BR-02': ['Chaque facture doit avoir un numéro de facture.', 'Ajouter le numéro de facture dans BT-1.'],
  'BR-03': ['Chaque facture doit avoir une date d’émission.', 'Ajouter la date d’émission dans BT-2.'],
  'BR-04': ['Le type de facture doit être indiqué par un code, p. ex. 380 pour une facture ou 381 pour un avoir.', 'Indiquer le code de type dans BT-3.'],
  'BR-05': ['La devise de la facture doit être indiquée.', 'Indiquer le code de devise (p. ex. EUR) dans BT-5.'],
  'BR-06': ['La raison sociale du vendeur doit figurer sur la facture.', 'Saisir le nom du vendeur dans BT-27.'],
  'BR-07': ['Le nom de l’acheteur doit figurer sur la facture.', 'Saisir le nom de l’acheteur dans BT-44.'],
  'BR-08': ['La facture doit contenir l’adresse postale du vendeur.', 'Ajouter l’adresse postale du vendeur (BG-5).'],
  'BR-09': ['L’adresse du vendeur doit comporter un code pays.', 'Indiquer un code pays ISO 3166 (p. ex. FR) dans BT-40.'],
  'BR-10': ['La facture doit contenir l’adresse postale de l’acheteur.', 'Ajouter l’adresse postale de l’acheteur (BG-8).'],
  'BR-11': ['L’adresse de l’acheteur doit comporter un code pays.', 'Indiquer un code pays ISO 3166 dans BT-55.'],
  'BR-12': ['La somme des montants nets des lignes doit être indiquée.', 'Saisir la somme de tous les montants de ligne dans BT-106.'],
  'BR-13': ['Le montant total hors TVA doit être indiqué.', 'Saisir le montant hors TVA dans BT-109.'],
  'BR-14': ['Le montant total TVA comprise doit être indiqué.', 'Saisir le montant TTC dans BT-112.'],
  'BR-15': ['Le montant net à payer doit être indiqué.', 'Saisir le net à payer dans BT-115 (0 est admis, p. ex. pour un avoir).'],
  'BR-16': ['Une facture doit comporter au moins une ligne.', 'Ajouter au moins une ligne de facture (BG-25).'],
  'BR-17': ['Si un bénéficiaire du paiement distinct est indiqué, il doit avoir un nom.', 'Ajouter le nom du bénéficiaire dans BT-59 ou supprimer le groupe.'],
  'BR-18': ['Un représentant fiscal du vendeur doit avoir un nom.', 'Ajouter le nom dans BT-62.'],
  'BR-19': ['Un représentant fiscal doit avoir une adresse postale.', 'Ajouter l’adresse du représentant fiscal (BG-12).'],
  'BR-20': ['L’adresse du représentant fiscal doit comporter un code pays.', 'Indiquer le code pays dans BT-69.'],
  'BR-21': ['Chaque ligne doit avoir un identifiant.', 'Numéroter chaque ligne (BT-126), p. ex. 1, 2, 3.'],
  'BR-22': ['Chaque ligne doit avoir une quantité.', 'Saisir la quantité dans BT-129 (1 pour un forfait).'],
  'BR-23': ['Chaque quantité doit avoir un code d’unité.', 'Indiquer un code d’unité UN/ECE Rec. 20, p. ex. C62 (pièce), HUR (heure), DAY (jour).'],
  'BR-24': ['Chaque ligne doit avoir un montant net.', 'Saisir le montant de la ligne (quantité × prix, moins les remises) dans BT-131.'],
  'BR-25': ['Chaque ligne doit avoir une désignation.', 'Saisir la désignation de l’article ou de la prestation dans BT-153.'],
  'BR-26': ['Chaque ligne doit avoir un prix net.', 'Saisir le prix unitaire dans BT-146.'],
  'BR-27': ['Le prix net d’une ligne ne doit pas être négatif ; pour créditer, on utilise une quantité négative ou un avoir (381).', 'Indiquer un prix positif et une quantité négative à la place.'],
  'BR-28': ['Le prix brut d’une ligne ne doit pas être négatif.', 'Indiquer un prix brut positif.'],
  'BR-29': ['La période de facturation ne peut pas se terminer avant d’avoir commencé.', 'Vérifier les dates de début et de fin dans BG-14.'],
  'BR-30': ['La période d’une ligne ne peut pas se terminer avant d’avoir commencé.', 'Vérifier les dates de la période de la ligne.'],
  'BR-31': ['Chaque remise au niveau du document doit avoir un montant.', 'Saisir le montant de la remise dans BT-92.'],
  'BR-32': ['Chaque remise au niveau du document doit avoir une catégorie de TVA.', 'Indiquer la catégorie de TVA (p. ex. S) dans BT-95.'],
  'BR-33': ['Chaque remise doit avoir un motif, en texte ou sous forme de code.', 'Indiquer un motif dans BT-97 ou un code dans BT-98, p. ex. « Remise » ou 95.'],
  'BR-36': ['Chaque charge (frais) au niveau du document doit avoir un montant.', 'Saisir le montant de la charge dans BT-99.'],
  'BR-37': ['Chaque charge au niveau du document doit avoir une catégorie de TVA.', 'Indiquer la catégorie de TVA dans BT-102.'],
  'BR-38': ['Chaque charge doit avoir un motif, en texte ou sous forme de code.', 'Indiquer un motif dans BT-104 ou un code dans BT-105, p. ex. « Transport » ou FC.'],
  'BR-41': ['Chaque remise sur une ligne doit avoir un montant.', 'Saisir le montant dans BT-136.'],
  'BR-42': ['Chaque remise sur une ligne doit avoir un motif.', 'Indiquer un motif dans BT-139 ou un code dans BT-140.'],
  'BR-43': ['Chaque charge sur une ligne doit avoir un montant.', 'Saisir le montant dans BT-141.'],
  'BR-44': ['Chaque charge sur une ligne doit avoir un motif.', 'Indiquer un motif dans BT-144 ou un code dans BT-145.'],
  'BR-45': ['Chaque ligne de ventilation de la TVA doit avoir une base d’imposition.', 'Saisir le montant hors TVA par taux dans BT-116.'],
  'BR-46': ['Chaque ligne de ventilation de la TVA doit avoir un montant de TVA.', 'Saisir le montant de TVA dans BT-117 (0 pour les opérations exonérées).'],
  'BR-47': ['Chaque ligne de ventilation de la TVA doit avoir une catégorie de TVA.', 'Indiquer la catégorie (S, Z, E, AE, K, G, O…) dans BT-118.'],
  'BR-48': ['Chaque ligne de ventilation de la TVA doit avoir un taux, sauf pour les opérations non soumises à la TVA.', 'Saisir le taux dans BT-119, p. ex. 20 ou 0.'],
  'BR-49': ['Chaque instruction de paiement doit avoir un code de moyen de paiement.', 'Indiquer un code UNTDID 4461 dans BT-81, p. ex. 58 pour un virement SEPA.'],
  'BR-51': ['Par sécurité, une facture ne devrait jamais contenir le numéro de carte complet, au plus les six premiers et les quatre derniers chiffres.', 'Tronquer le numéro de carte.'],
  'BR-52': ['Chaque pièce justificative doit avoir une référence.', 'Saisir la référence du document dans BT-122.'],
  'BR-53': ['Si une devise de comptabilisation de la TVA est indiquée, le montant total de TVA doit aussi être exprimé dans cette devise.', 'Ajouter le total de TVA dans la devise de comptabilisation (BT-111).'],
  'BR-54': ['Chaque attribut d’article doit avoir un nom et une valeur.', 'Renseigner le nom et la valeur ou supprimer l’attribut.'],
  'BR-55': ['Une référence à une facture antérieure doit indiquer le numéro de cette facture.', 'Saisir le numéro dans BT-25.'],
  'BR-56': ['Un représentant fiscal doit avoir un numéro de TVA.', 'Saisir le numéro de TVA du représentant fiscal dans BT-63.'],
  'BR-57': ['Une adresse de livraison doit comporter un code pays.', 'Indiquer le code pays dans BT-80.'],
  'BR-61': ['En cas de paiement par virement (code 30 ou 58), le compte du bénéficiaire (IBAN) doit être indiqué.', 'Saisir l’IBAN dans BT-84.'],
  'BR-62': ['L’adresse électronique du vendeur doit avoir un identifiant de schéma.', 'Indiquer le schéma, p. ex. EM pour une adresse e-mail ou 0009 pour un SIRET.'],
  'BR-63': ['L’adresse électronique de l’acheteur doit avoir un identifiant de schéma.', 'Indiquer le schéma, p. ex. EM pour une adresse e-mail ou 0009 pour un SIRET.'],
  'BR-64': ['Un identifiant standard d’article (p. ex. GTIN) doit avoir un identifiant de schéma.', 'Indiquer l’identifiant de schéma, 0160 pour un GTIN.'],
  'BR-65': ['Une classification d’article doit indiquer le système de classification utilisé.', 'Renseigner le listID, p. ex. STI ou IB.'],

  'BR-CO-03': ['La date d’exigibilité de la TVA et son code sont incompatibles.', 'N’en conserver qu’un seul.'],
  'BR-CO-04': ['Chaque ligne doit avoir une catégorie de TVA.', 'Indiquer la catégorie dans BT-151, le plus souvent S avec le taux.'],
  'BR-CO-09': ['Un numéro de TVA commence par le code du pays qui l’a attribué (Grèce : EL).', 'Ajouter le code pays en tête, p. ex. FR12345678901. Un SIREN ou un SIRET n’a pas sa place dans ce champ.'],
  'BR-CO-10': ['La somme des lignes doit être égale au total de tous les montants de ligne.', 'Recalculer les montants de ligne et BT-106.'],
  'BR-CO-11': ['Le total des remises doit être égal à la somme des remises au niveau du document.', 'Recalculer BT-107 à partir des remises (BT-92).'],
  'BR-CO-12': ['Le total des charges doit être égal à la somme des charges au niveau du document.', 'Recalculer BT-108 à partir des charges (BT-99).'],
  'BR-CO-13': ['Montant hors TVA = somme des lignes − remises + charges.', 'Recalculer BT-109.'],
  'BR-CO-14': ['Le total de TVA doit être égal à la somme des montants de TVA par taux.', 'Recalculer BT-110 à partir de la ventilation de la TVA.'],
  'BR-CO-15': ['Montant TTC = montant hors TVA + TVA.', 'Recalculer BT-112.'],
  'BR-CO-16': ['Net à payer = montant TTC − montant déjà payé + arrondi.', 'Recalculer BT-115 ; les acomptes vont dans BT-113.'],
  'BR-CO-17': ['Montant de TVA = base d’imposition × taux, arrondi à deux décimales.', 'Recalculer la TVA de cette catégorie.'],
  'BR-CO-18': ['Chaque facture doit contenir au moins une ligne de ventilation de la TVA, même pour des opérations exonérées.', 'Ajouter une ventilation de la TVA (BG-23) avec catégorie, taux, base et montant.'],
  'BR-CO-19': ['Une période de facturation doit avoir une date de début ou de fin.', 'Ajouter une date ou supprimer le groupe vide.'],
  'BR-CO-20': ['La période d’une ligne doit avoir une date de début ou de fin.', 'Ajouter une date ou supprimer le groupe vide.'],
  'BR-CO-26': ['Pour que l’acheteur puisse identifier automatiquement le vendeur, il faut un identifiant du vendeur, un identifiant légal ou un numéro de TVA.', 'Ajouter le numéro de TVA (BT-31) ou l’identifiant légal, p. ex. le SIREN (BT-30).'],

  'BR-S-09': ['TVA au taux normal = base d’imposition × taux.', 'Recalculer la TVA pour chaque taux.'],
  'BR-IC-11': ['Une livraison intracommunautaire doit indiquer une date de livraison ou une période de facturation.', 'Ajouter la date de livraison (BT-72) ou la période (BG-14).'],
  'BR-IC-12': ['Une livraison intracommunautaire doit indiquer le pays de livraison.', 'Ajouter une adresse de livraison avec code pays (BT-80).'],
  'BR-O-11': ['Une facture comportant des opérations « non soumises à la TVA » (O) ne doit contenir aucune autre catégorie de TVA.', 'Facturer les autres opérations séparément.'],
  'BR-O-12': ['Avec la catégorie « non soumis à la TVA » (O), toutes les lignes doivent utiliser la catégorie O.', 'Corriger la catégorie des lignes ou facturer séparément.'],

  'BR-CL-01': ['Le code de type de facture doit provenir de la liste UNTDID 1001.', 'Utiliser un code valide, le plus souvent 380.'],
  'BR-CL-03': ['Chaque currencyID sur un montant doit être un code ISO 4217 valide.', 'Vérifier les attributs currencyID, p. ex. EUR.'],
  'BR-CL-04': ['La devise de la facture doit être un code ISO 4217 valide.', 'Utiliser un code valide comme EUR.'],
  'BR-CL-14': ['Les codes pays doivent suivre la norme ISO 3166-1 (deux lettres majuscules).', 'Utiliser des codes comme FR, BE ou DE, pas le nom du pays.'],
  'BR-CL-16': ['Le code de moyen de paiement doit provenir de la liste UNTDID 4461.', 'Utiliser un code valide, p. ex. 58 (virement SEPA) ou 59 (prélèvement SEPA).'],
  'BR-CL-17': ['Les catégories de TVA doivent provenir de la liste UNTDID 5305.', 'Utiliser une catégorie valide : S, Z, E, AE, K, G, O, L ou M.'],
  'BR-CL-23': ['Les unités doivent être des codes UN/ECE Rec. 20/21.', 'Utiliser des codes plutôt que du texte : C62 pour les pièces, HUR pour les heures, KGM pour les kilogrammes.'],
  'BR-CL-25': ['Le schéma d’une adresse électronique doit provenir de la liste de codes EAS.', 'Vérifier le schéma, p. ex. EM (e-mail), 0009 (SIRET), 0204 (Leitweg-ID allemand).'],

  'BR-DE-1': xr('une XRechnung doit contenir des instructions de paiement.', 'Indiquer le moyen de paiement et les coordonnées bancaires (BG-16).'),
  'BR-DE-2': xr('une XRechnung doit indiquer un contact chez le vendeur, avec nom, téléphone et e-mail.', 'Renseigner entièrement le groupe de contact BG-6.'),
  'BR-DE-3': xr('la ville du vendeur est obligatoire.', 'Saisir la ville dans BT-37.'),
  'BR-DE-4': xr('le code postal du vendeur est obligatoire.', 'Saisir le code postal dans BT-38.'),
  'BR-DE-5': xr('le nom du contact chez le vendeur est obligatoire.', 'Saisir un nom ou un service dans BT-41.'),
  'BR-DE-6': xr('le numéro de téléphone du contact chez le vendeur est obligatoire.', 'Saisir le numéro de téléphone dans BT-42.'),
  'BR-DE-7': xr('l’adresse e-mail du contact chez le vendeur est obligatoire.', 'Saisir l’adresse e-mail dans BT-43.'),
  'BR-DE-8': xr('la ville de l’acheteur est obligatoire.', 'Saisir la ville dans BT-52.'),
  'BR-DE-9': xr('le code postal de l’acheteur est obligatoire.', 'Saisir le code postal dans BT-53.'),
  'BR-DE-10': xr('une adresse de livraison doit comporter une ville.', 'Saisir la ville dans BT-77.'),
  'BR-DE-11': xr('une adresse de livraison doit comporter un code postal.', 'Saisir le code postal dans BT-78.'),
  'BR-DE-14': xr('chaque ligne de ventilation de la TVA doit avoir un taux, même 0.', 'Saisir le taux dans BT-119.'),
  'BR-DE-15': xr('la référence acheteur est obligatoire ; pour un acheteur public allemand, il s’agit de la Leitweg-ID.', 'Saisir la Leitweg-ID ou la référence fournie par l’acheteur dans BT-10.'),
  'BR-DE-16': xr('pour des opérations taxables, le vendeur doit indiquer un numéro de TVA, un identifiant fiscal ou un représentant fiscal.', 'Ajouter le numéro de TVA (BT-31) ou l’identifiant fiscal (BT-32).'),
  'BR-DE-17': xr('seuls les codes de type 326, 380, 381, 384, 389, 875, 876 et 877 sont prévus.', 'Choisir un code adapté, le plus souvent 380, ou 381 pour un avoir.'),
  'BR-DE-18': xr('l’escompte pour paiement anticipé doit figurer dans les conditions de paiement sous un format fixe, #SKONTO#TAGE=14#PROZENT=2.00#, une indication par ligne, chaque ligne terminée par un saut de ligne.', 'Écrire les lignes d’escompte exactement selon ce modèle, pourcentage avec un point et deux décimales.'),
  'BR-DE-19': xr('pour un virement SEPA (code 58), un IBAN valide devrait être indiqué.', 'Vérifier l’IBAN.'),
  'BR-DE-20': xr('pour un prélèvement SEPA (code 59), le compte débité devrait être un IBAN valide.', 'Vérifier l’IBAN du payeur.'),
  'BR-DE-21': xr('l’identifiant de spécification devrait être celui de XRechnung.', 'Indiquer dans BT-24 urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0.'),
  'BR-DE-22': xr('les noms des pièces jointes intégrées doivent être uniques.', 'Renommer les pièces jointes en double.'),
  'BR-DE-23-a': xr('en cas de virement (code 30 ou 58), les coordonnées du compte (BG-17) doivent être indiquées.', 'Ajouter l’IBAN du bénéficiaire.'),
  'BR-DE-23-b': xr('en cas de virement, aucune donnée de carte ni de prélèvement ne doit figurer.', 'Supprimer les données de carte ou de prélèvement, ou créer une instruction de paiement distincte.'),
  'BR-DE-24-a': xr('en cas de paiement par carte (code 48, 54, 55), les données de la carte doivent être indiquées.', 'Ajouter le numéro de carte tronqué (BT-87).'),
  'BR-DE-24-b': xr('en cas de paiement par carte, aucune donnée de virement ni de prélèvement ne doit figurer.', 'Supprimer les données superflues.'),
  'BR-DE-25-a': xr('en cas de prélèvement SEPA (code 59), les données du prélèvement doivent être indiquées.', 'Ajouter la référence du mandat (BT-89) et l’IBAN du payeur (BT-91).'),
  'BR-DE-25-b': xr('en cas de prélèvement, aucune donnée de virement ni de carte ne doit figurer.', 'Supprimer les données superflues.'),
  'BR-DE-26': xr('une facture rectificative (384) devrait faire référence à la facture d’origine.', 'Indiquer le numéro et la date de la facture rectifiée dans BG-3.'),
  'BR-DE-27': xr('le numéro de téléphone devrait comporter au moins trois chiffres.', 'Saisir le numéro de téléphone complet.'),
  'BR-DE-28': xr('l’adresse e-mail devrait être bien formée : un seul @, aucun espace.', 'Corriger l’adresse e-mail.'),
  'BR-DE-30': xr('en cas de prélèvement, l’identifiant créancier SEPA doit être indiqué.', 'Ajouter l’identifiant créancier (BT-90).'),
  'BR-DE-31': xr('en cas de prélèvement, le compte à débiter doit être indiqué.', 'Ajouter l’IBAN du payeur (BT-91).'),
  'BR-DE-TMP-32': xr('la facture devrait indiquer la date de livraison ou de prestation, sous forme de date, de période ou par ligne.', 'Ajouter la date de livraison (BT-72) ou la période (BG-14).'),
};

/* VAT category rules follow the same pattern for every category, so the texts are built from templates as in rule-texts.ts. */
const CATS: Record<string, { label: string; zero: boolean; reason: boolean; ids: string }> = {
  S: { label: 'taux normal (S)', zero: false, reason: false, ids: 'le numéro de TVA, l’identifiant fiscal ou le représentant fiscal du vendeur' },
  Z: { label: 'taux zéro (Z)', zero: true, reason: false, ids: 'le numéro de TVA, l’identifiant fiscal ou le représentant fiscal du vendeur' },
  E: { label: 'exonéré (E)', zero: true, reason: true, ids: 'le numéro de TVA, l’identifiant fiscal ou le représentant fiscal du vendeur' },
  AE: { label: 'autoliquidation (AE)', zero: true, reason: true, ids: 'un identifiant fiscal du vendeur et le numéro de TVA ou l’identifiant légal de l’acheteur' },
  IC: { label: 'livraison intracommunautaire (K)', zero: true, reason: true, ids: 'le numéro de TVA du vendeur (ou de son représentant fiscal) et le numéro de TVA de l’acheteur' },
  G: { label: 'exportation hors UE (G)', zero: true, reason: true, ids: 'le numéro de TVA du vendeur ou de son représentant fiscal' },
  O: { label: 'non soumis à la TVA (O)', zero: true, reason: true, ids: 'aucun numéro de TVA du vendeur, du représentant fiscal ou de l’acheteur' },
};

for (const [key, c] of Object.entries(CATS)) {
  const p = `BR-${key}`;
  const cat = `« ${c.label} »`;
  const one = key === 'S' ? 'au moins une ligne' : 'exactement une ligne';
  BASE[`${p}-01`] = [`Les opérations en catégorie ${cat} exigent ${one} de cette catégorie dans la ventilation de la TVA.`, `Ajouter ou regrouper la ligne de catégorie ${key === 'IC' ? 'K' : key} dans BG-23.`];
  BASE[`${p}-02`] =
    key === 'O'
      ? [`Avec la catégorie ${cat}, la facture ne doit contenir ${c.ids}.`, 'Supprimer les numéros de TVA ou vérifier la catégorie.']
      : [`Avec la catégorie ${cat}, la facture doit indiquer ${c.ids}.`, 'Ajouter l’identifiant fiscal manquant.'];
  const rate = key === 'S' ? 'être supérieur à 0' : key === 'O' ? 'être absent' : 'être égal à 0';
  for (const [suffix, where, bt] of [
    ['05', 'd’une ligne', 'BT-152'],
    ['06', 'd’une remise', 'BT-96'],
    ['07', 'd’une charge', 'BT-103'],
  ] as const) {
    BASE[`${p}-${suffix}`] = [`Avec la catégorie ${cat}, le taux de TVA ${where} doit ${rate}.`, `Corriger le taux dans ${bt} ou vérifier la catégorie.`];
  }
  BASE[`${p}-08`] = [`La base d’imposition de la catégorie ${cat} doit être égale à la somme des lignes de cette catégorie${key === 'S' || key === 'Z' ? ' et de ce taux' : ''}, moins les remises, plus les charges.`, 'Recalculer la base d’imposition.'];
  if (c.zero) BASE[`${p}-09`] = [`Avec la catégorie ${cat}, le montant de TVA doit être égal à 0.`, 'Mettre la TVA à 0 ou vérifier la catégorie.'];
  BASE[`${p}-10`] = c.reason
    ? [`Avec la catégorie ${cat}, un motif d’exonération doit être indiqué, en texte ou sous forme de code.`, key === 'AE' ? 'Ajouter le motif, p. ex. « Autoliquidation » ou le code VATEX-EU-AE.' : 'Ajouter le motif en texte (BT-120) ou sous forme de code (BT-121).']
    : [`Avec la catégorie ${cat}, aucun motif d’exonération ne doit être indiqué.`, 'Supprimer le motif d’exonération.'];
}

// Copied from rule-texts.ts, where the map is module-private.
const DEC: Record<string, string> = {
  'BR-DEC-01': 'BT-92',
  'BR-DEC-02': 'BT-93',
  'BR-DEC-05': 'BT-99',
  'BR-DEC-06': 'BT-100',
  'BR-DEC-09': 'BT-106',
  'BR-DEC-10': 'BT-107',
  'BR-DEC-11': 'BT-108',
  'BR-DEC-12': 'BT-109',
  'BR-DEC-13': 'BT-110',
  'BR-DEC-14': 'BT-112',
  'BR-DEC-16': 'BT-113',
  'BR-DEC-17': 'BT-114',
  'BR-DEC-18': 'BT-115',
  'BR-DEC-19': 'BT-116',
  'BR-DEC-20': 'BT-117',
  'BR-DEC-23': 'BT-131',
  'BR-DEC-24': 'BT-136',
  'BR-DEC-27': 'BT-141',
};
for (const [id, bt] of Object.entries(DEC)) {
  BASE[id] = [`Les montants de ${bt} ne doivent pas avoir plus de deux décimales.`, 'Arrondir au centime. Davantage de décimales ne sont admises que pour les prix unitaires et les quantités.'];
}

export const RULE_TEXTS_FR: Readonly<Record<string, Pair>> = BASE;
