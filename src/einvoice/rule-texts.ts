/*
 * Plain-language wording for every rule the validator reports: what the rule
 * demands, and what to change. Rule IDs and severities follow the EN 16931
 * Schematron and the XRechnung 3.0.2 Schematron (KoSIT); the sentences are our
 * own explanations, not the official rule texts.
 */

import { RULE_TEXTS_FR } from './rule-texts-fr.ts';

export type RuleLang = 'de' | 'en' | 'fr';
type Pair = [msg: string, fix: string];
interface Entry {
  sev: 'error' | 'warning';
  bt: string;
  de: Pair;
  en: Pair;
}

const E = (bt: string, de: Pair, en: Pair): Entry => ({ sev: 'error', bt, de, en });
const W = (bt: string, de: Pair, en: Pair): Entry => ({ sev: 'warning', bt, de, en });

const BASE: Record<string, Entry> = {
  Profile: W(
    'BT-24',
    ['Das Profil (z. B. MINIMUM, BASIC WL, ZUGFeRD 1.0) enthält keinen vollständigen Datensatz nach EN 16931 und gilt in Deutschland nicht als E-Rechnung.', 'Bitten Sie den Absender um eine Rechnung im Profil EN 16931 (COMFORT), EXTENDED oder XRECHNUNG.'],
    ['The profile (e.g. MINIMUM, BASIC WL, ZUGFeRD 1.0) does not carry a full EN 16931 data set and is not an e-invoice under German law.', 'Ask the sender for an invoice in the EN 16931 (COMFORT), EXTENDED or XRECHNUNG profile.'],
  ),
  IBAN: E(
    'BT-84',
    ['Die angegebene IBAN muss eine gültige Prüfziffer haben, sonst landet die Zahlung nicht beim Empfänger.', 'IBAN mit den Bankunterlagen vergleichen; meist ist eine Ziffer vertauscht.'],
    ['The IBAN must have valid check digits, otherwise the payment cannot reach the payee.', 'Compare the IBAN with the bank details; usually two digits are swapped.'],
  ),
  'BR-01': E('BT-24', ['Jede Rechnung nennt die Spezifikation, nach der sie erstellt wurde (z. B. XRechnung 3.0).', 'Kennung der Spezifikation in BT-24 eintragen, etwa urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0.'], ['Every invoice states the specification it follows (e.g. XRechnung 3.0).', 'Fill in BT-24, e.g. urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0.']),
  'BR-02': E('BT-1', ['Jede Rechnung braucht eine Rechnungsnummer.', 'Rechnungsnummer in BT-1 ergänzen.'], ['Every invoice needs an invoice number.', 'Add the invoice number in BT-1.']),
  'BR-03': E('BT-2', ['Jede Rechnung braucht ein Rechnungsdatum.', 'Rechnungsdatum in BT-2 ergänzen.'], ['Every invoice needs an issue date.', 'Add the issue date in BT-2.']),
  'BR-04': E('BT-3', ['Die Art der Rechnung muss als Code angegeben sein, z. B. 380 für eine Rechnung oder 381 für eine Gutschrift.', 'Rechnungsart-Code in BT-3 setzen.'], ['The invoice type must be given as a code, e.g. 380 for an invoice or 381 for a credit note.', 'Set the type code in BT-3.']),
  'BR-05': E('BT-5', ['Die Rechnungswährung muss angegeben sein.', 'Währungscode (z. B. EUR) in BT-5 setzen.'], ['The invoice currency must be stated.', 'Set the currency code (e.g. EUR) in BT-5.']),
  'BR-06': E('BT-27', ['Der Name des Verkäufers muss in der Rechnung stehen.', 'Firmennamen des Rechnungsstellers in BT-27 eintragen.'], ['The seller’s name must be in the invoice.', 'Enter the seller’s company name in BT-27.']),
  'BR-07': E('BT-44', ['Der Name des Käufers muss in der Rechnung stehen.', 'Namen des Rechnungsempfängers in BT-44 eintragen.'], ['The buyer’s name must be in the invoice.', 'Enter the buyer’s name in BT-44.']),
  'BR-08': E('BG-5', ['Die Rechnung muss die Postanschrift des Verkäufers enthalten.', 'Postanschrift des Rechnungsstellers (BG-5) ergänzen.'], ['The invoice must contain the seller’s postal address.', 'Add the seller’s postal address (BG-5).']),
  'BR-09': E('BT-40', ['Die Anschrift des Verkäufers braucht einen Ländercode.', 'Ländercode nach ISO 3166 (z. B. DE) in BT-40 setzen.'], ['The seller’s address needs a country code.', 'Set an ISO 3166 country code (e.g. DE) in BT-40.']),
  'BR-10': E('BG-8', ['Die Rechnung muss die Postanschrift des Käufers enthalten.', 'Postanschrift des Rechnungsempfängers (BG-8) ergänzen.'], ['The invoice must contain the buyer’s postal address.', 'Add the buyer’s postal address (BG-8).']),
  'BR-11': E('BT-55', ['Die Anschrift des Käufers braucht einen Ländercode.', 'Ländercode nach ISO 3166 in BT-55 setzen.'], ['The buyer’s address needs a country code.', 'Set an ISO 3166 country code in BT-55.']),
  'BR-12': E('BT-106', ['Die Summe der Positionen (netto) muss angegeben sein.', 'Summe aller Positionsbeträge in BT-106 eintragen.'], ['The sum of line net amounts must be stated.', 'Enter the sum of all line amounts in BT-106.']),
  'BR-13': E('BT-109', ['Der Rechnungsbetrag ohne Umsatzsteuer muss angegeben sein.', 'Nettobetrag in BT-109 eintragen.'], ['The total without VAT must be stated.', 'Enter the net total in BT-109.']),
  'BR-14': E('BT-112', ['Der Rechnungsbetrag mit Umsatzsteuer muss angegeben sein.', 'Bruttobetrag in BT-112 eintragen.'], ['The total with VAT must be stated.', 'Enter the gross total in BT-112.']),
  'BR-15': E('BT-115', ['Der Zahlbetrag muss angegeben sein.', 'Fälligen Betrag in BT-115 eintragen (bei Gutschriften ggf. 0).'], ['The amount due must be stated.', 'Enter the amount due in BT-115 (0 is allowed, e.g. for credit notes).']),
  'BR-16': E('BG-25', ['Eine Rechnung braucht mindestens eine Position.', 'Mindestens eine Rechnungsposition (BG-25) anlegen.'], ['An invoice needs at least one line.', 'Add at least one invoice line (BG-25).']),
  'BR-17': E('BT-59', ['Ist ein abweichender Zahlungsempfänger angegeben, braucht er einen Namen.', 'Namen des Zahlungsempfängers in BT-59 ergänzen oder die Gruppe entfernen.'], ['If a different payee is given, it needs a name.', 'Add the payee name in BT-59 or remove the payee group.']),
  'BR-18': E('BT-62', ['Ein Steuervertreter des Verkäufers braucht einen Namen.', 'Namen in BT-62 ergänzen.'], ['A seller tax representative needs a name.', 'Add the name in BT-62.']),
  'BR-19': E('BG-12', ['Ein Steuervertreter braucht eine Postanschrift.', 'Anschrift des Steuervertreters (BG-12) ergänzen.'], ['A tax representative needs a postal address.', 'Add the representative’s address (BG-12).']),
  'BR-20': E('BT-69', ['Die Anschrift des Steuervertreters braucht einen Ländercode.', 'Ländercode in BT-69 setzen.'], ['The tax representative’s address needs a country code.', 'Set the country code in BT-69.']),
  'BR-21': E('BT-126', ['Jede Position braucht eine Positionsnummer.', 'Positionsnummer (BT-126) vergeben, z. B. 1, 2, 3.'], ['Every line needs a line ID.', 'Give every line an ID (BT-126), e.g. 1, 2, 3.']),
  'BR-22': E('BT-129', ['Jede Position braucht eine Menge.', 'Menge in BT-129 eintragen (bei Pauschalen 1).'], ['Every line needs a quantity.', 'Enter the quantity in BT-129 (1 for lump sums).']),
  'BR-23': E('BT-130', ['Jede Mengenangabe braucht eine Einheit als Code.', 'Einheitencode nach UN/ECE Rec. 20 setzen, z. B. C62 (Stück), HUR (Stunde), DAY (Tag).'], ['Every quantity needs a unit code.', 'Set a UN/ECE Rec. 20 unit code, e.g. C62 (piece), HUR (hour), DAY (day).']),
  'BR-24': E('BT-131', ['Jede Position braucht einen Nettobetrag.', 'Positionsbetrag (Menge × Preis abzüglich Nachlässe) in BT-131 eintragen.'], ['Every line needs a net amount.', 'Enter the line amount (quantity × price less allowances) in BT-131.']),
  'BR-25': E('BT-153', ['Jede Position braucht eine Bezeichnung.', 'Artikel- oder Leistungsbezeichnung in BT-153 eintragen.'], ['Every line needs an item name.', 'Enter the item or service name in BT-153.']),
  'BR-26': E('BT-146', ['Jede Position braucht einen Nettopreis.', 'Einzelpreis in BT-146 eintragen.'], ['Every line needs a net price.', 'Enter the unit price in BT-146.']),
  'BR-27': E('BT-146', ['Der Nettopreis einer Position darf nicht negativ sein. Gutschriftsbeträge werden über die Menge oder eine Gutschrift (381) abgebildet.', 'Preis positiv angeben und stattdessen die Menge negativ setzen.'], ['A line’s net price must not be negative; credits go through a negative quantity or a credit note (381).', 'Make the price positive and the quantity negative instead.']),
  'BR-28': E('BT-148', ['Der Bruttopreis einer Position darf nicht negativ sein.', 'Bruttopreis positiv angeben.'], ['A line’s gross price must not be negative.', 'Make the gross price positive.']),
  'BR-29': E('BT-73, BT-74', ['Das Ende des Abrechnungszeitraums darf nicht vor seinem Beginn liegen.', 'Start- und Enddatum in BG-14 prüfen.'], ['The invoicing period cannot end before it starts.', 'Check the start and end dates in BG-14.']),
  'BR-30': E('BT-134, BT-135', ['Das Ende des Zeitraums einer Position darf nicht vor seinem Beginn liegen.', 'Datumsangaben der Position prüfen.'], ['A line period cannot end before it starts.', 'Check the dates of the line period.']),
  'BR-31': E('BT-92', ['Jeder Nachlass auf Belegebene braucht einen Betrag.', 'Betrag des Nachlasses in BT-92 eintragen.'], ['Every document-level allowance needs an amount.', 'Enter the allowance amount in BT-92.']),
  'BR-32': E('BT-95', ['Jeder Nachlass auf Belegebene braucht eine Umsatzsteuerkategorie.', 'Steuerkategorie (z. B. S) in BT-95 setzen.'], ['Every document-level allowance needs a VAT category.', 'Set the VAT category (e.g. S) in BT-95.']),
  'BR-33': E('BT-97, BT-98', ['Jeder Nachlass braucht einen Grund, als Text oder Code.', 'Grund in BT-97 oder Code in BT-98 angeben, z. B. „Rabatt“ bzw. 95.'], ['Every allowance needs a reason, as text or code.', 'Give a reason in BT-97 or a code in BT-98, e.g. “Discount” or 95.']),
  'BR-36': E('BT-99', ['Jeder Zuschlag auf Belegebene braucht einen Betrag.', 'Betrag des Zuschlags in BT-99 eintragen.'], ['Every document-level charge needs an amount.', 'Enter the charge amount in BT-99.']),
  'BR-37': E('BT-102', ['Jeder Zuschlag auf Belegebene braucht eine Umsatzsteuerkategorie.', 'Steuerkategorie in BT-102 setzen.'], ['Every document-level charge needs a VAT category.', 'Set the VAT category in BT-102.']),
  'BR-38': E('BT-104, BT-105', ['Jeder Zuschlag braucht einen Grund, als Text oder Code.', 'Grund in BT-104 oder Code in BT-105 angeben, z. B. „Versand“ bzw. FC.'], ['Every charge needs a reason, as text or code.', 'Give a reason in BT-104 or a code in BT-105, e.g. “Freight” or FC.']),
  'BR-41': E('BT-136', ['Jeder Nachlass auf eine Position braucht einen Betrag.', 'Betrag in BT-136 eintragen.'], ['Every line allowance needs an amount.', 'Enter the amount in BT-136.']),
  'BR-42': E('BT-139, BT-140', ['Jeder Nachlass auf eine Position braucht einen Grund.', 'Grund in BT-139 oder Code in BT-140 angeben.'], ['Every line allowance needs a reason.', 'Give a reason in BT-139 or a code in BT-140.']),
  'BR-43': E('BT-141', ['Jeder Zuschlag auf eine Position braucht einen Betrag.', 'Betrag in BT-141 eintragen.'], ['Every line charge needs an amount.', 'Enter the amount in BT-141.']),
  'BR-44': E('BT-144, BT-145', ['Jeder Zuschlag auf eine Position braucht einen Grund.', 'Grund in BT-144 oder Code in BT-145 angeben.'], ['Every line charge needs a reason.', 'Give a reason in BT-144 or a code in BT-145.']),
  'BR-45': E('BT-116', ['Jede Zeile der Steueraufschlüsselung braucht eine Bemessungsgrundlage.', 'Nettobetrag je Steuersatz in BT-116 eintragen.'], ['Every VAT breakdown needs a taxable amount.', 'Enter the net amount per rate in BT-116.']),
  'BR-46': E('BT-117', ['Jede Zeile der Steueraufschlüsselung braucht einen Steuerbetrag.', 'Steuerbetrag in BT-117 eintragen (bei steuerfreien Umsätzen 0).'], ['Every VAT breakdown needs a tax amount.', 'Enter the tax amount in BT-117 (0 for exempt supplies).']),
  'BR-47': E('BT-118', ['Jede Zeile der Steueraufschlüsselung braucht eine Steuerkategorie.', 'Kategorie (S, Z, E, AE, K, G, O …) in BT-118 setzen.'], ['Every VAT breakdown needs a VAT category.', 'Set the category (S, Z, E, AE, K, G, O …) in BT-118.']),
  'BR-48': E('BT-119', ['Jede Zeile der Steueraufschlüsselung braucht einen Steuersatz, außer bei „nicht steuerbar“.', 'Steuersatz in BT-119 eintragen, z. B. 19 oder 0.'], ['Every VAT breakdown needs a rate unless the supply is not subject to VAT.', 'Enter the rate in BT-119, e.g. 19 or 0.']),
  'BR-49': E('BT-81', ['Jede Zahlungsanweisung braucht einen Code für die Zahlungsart.', 'Code nach UNTDID 4461 in BT-81 setzen, z. B. 58 für SEPA-Überweisung.'], ['Every payment instruction needs a payment means code.', 'Set a UNTDID 4461 code in BT-81, e.g. 58 for SEPA credit transfer.']),
  'BR-51': W('BT-87', ['Aus Sicherheitsgründen soll eine Rechnung nie die vollständige Kartennummer enthalten, höchstens die ersten sechs und letzten vier Ziffern.', 'Kartennummer kürzen.'], ['For security, an invoice should never contain the full card number, at most the first six and last four digits.', 'Shorten the card number.']),
  'BR-52': E('BT-122', ['Jedes beigefügte Dokument braucht eine Referenz.', 'Kennung des Dokuments in BT-122 eintragen.'], ['Every supporting document needs a reference.', 'Enter the document reference in BT-122.']),
  'BR-53': E('BT-111', ['Ist eine abweichende Steuerwährung angegeben, muss die Umsatzsteuer auch in dieser Währung ausgewiesen sein.', 'Steuerbetrag in der Steuerwährung (BT-111) ergänzen.'], ['If a VAT accounting currency is given, the VAT total must also be stated in it.', 'Add the VAT total in accounting currency (BT-111).']),
  'BR-54': E('BT-160, BT-161', ['Jedes Artikelmerkmal braucht Name und Wert.', 'Name und Wert des Merkmals ergänzen oder das Merkmal entfernen.'], ['Every item attribute needs a name and a value.', 'Fill in name and value or remove the attribute.']),
  'BR-55': E('BT-25', ['Ein Verweis auf eine vorherige Rechnung braucht deren Nummer.', 'Nummer der Bezugsrechnung in BT-25 eintragen.'], ['A preceding invoice reference needs that invoice’s number.', 'Enter the number in BT-25.']),
  'BR-56': E('BT-63', ['Ein Steuervertreter braucht eine USt-IdNr.', 'USt-IdNr. des Steuervertreters in BT-63 eintragen.'], ['A tax representative needs a VAT ID.', 'Enter the representative’s VAT ID in BT-63.']),
  'BR-57': E('BT-80', ['Eine Lieferanschrift braucht einen Ländercode.', 'Ländercode in BT-80 setzen.'], ['A deliver-to address needs a country code.', 'Set the country code in BT-80.']),
  'BR-61': E('BT-84', ['Bei Zahlung per Überweisung (Code 30 oder 58) muss die Kontonummer bzw. IBAN des Empfängers angegeben sein.', 'IBAN in BT-84 eintragen.'], ['For payment by credit transfer (code 30 or 58) the payee’s account (IBAN) must be given.', 'Enter the IBAN in BT-84.']),
  'BR-62': E('BT-34', ['Die elektronische Adresse des Verkäufers braucht eine Schemaangabe.', 'Schema-ID setzen, z. B. EM für E-Mail oder 0204 für eine Leitweg-ID.'], ['The seller’s electronic address needs a scheme ID.', 'Set the scheme, e.g. EM for e-mail or 0204 for a Leitweg-ID.']),
  'BR-63': E('BT-49', ['Die elektronische Adresse des Käufers braucht eine Schemaangabe.', 'Schema-ID setzen, z. B. EM für E-Mail oder 0204 für eine Leitweg-ID.'], ['The buyer’s electronic address needs a scheme ID.', 'Set the scheme, e.g. EM for e-mail or 0204 for a Leitweg-ID.']),
  'BR-64': E('BT-157', ['Eine standardisierte Artikelnummer (z. B. GTIN) braucht eine Schemaangabe.', 'Schema-ID setzen, für GTIN 0160.'], ['A standard item ID (e.g. GTIN) needs a scheme ID.', 'Set the scheme ID, 0160 for GTIN.']),
  'BR-65': E('BT-158', ['Eine Artikelklassifizierung braucht eine Angabe des Klassifizierungssystems.', 'listID setzen, z. B. STI für eCl@ss oder IB für ISBN.'], ['An item classification needs the identifier of its scheme.', 'Set the listID, e.g. STI or IB.']),

  'BR-CO-03': E('BT-7, BT-8', ['Steuerdatum und Code für das Steuerdatum schließen sich aus.', 'Nur eines von beiden angeben.'], ['The VAT point date and the VAT point date code are mutually exclusive.', 'Keep only one of them.']),
  'BR-CO-04': E('BT-151', ['Jede Position braucht eine Umsatzsteuerkategorie.', 'Kategorie in BT-151 setzen, meist S mit dem Steuersatz.'], ['Every line needs a VAT category.', 'Set the category in BT-151, usually S with the rate.']),
  'BR-CO-09': E('BT-31, BT-48, BT-63', ['Eine USt-IdNr. beginnt mit dem Ländercode des ausstellenden Staates (Griechenland: EL).', 'Ländercode voranstellen, z. B. DE123456789. Eine Steuernummer gehört nicht in dieses Feld.'], ['A VAT ID starts with the issuing country’s code (Greece: EL).', 'Prefix the country code, e.g. DE123456789. A national tax number does not belong in this field.']),
  'BR-CO-10': E('BT-106', ['Die Summe der Positionen muss der Summe aller Positionsbeträge entsprechen.', 'Positionsbeträge und BT-106 neu berechnen.'], ['The sum of lines must equal the total of all line amounts.', 'Recalculate the line amounts and BT-106.']),
  'BR-CO-11': E('BT-107', ['Die Summe der Nachlässe muss den einzelnen Nachlässen auf Belegebene entsprechen.', 'BT-107 aus den einzelnen Nachlässen (BT-92) neu berechnen.'], ['The allowance total must equal the document-level allowances.', 'Recalculate BT-107 from the allowances (BT-92).']),
  'BR-CO-12': E('BT-108', ['Die Summe der Zuschläge muss den einzelnen Zuschlägen auf Belegebene entsprechen.', 'BT-108 aus den einzelnen Zuschlägen (BT-99) neu berechnen.'], ['The charge total must equal the document-level charges.', 'Recalculate BT-108 from the charges (BT-99).']),
  'BR-CO-13': E('BT-109', ['Nettobetrag = Summe der Positionen − Nachlässe + Zuschläge.', 'BT-109 neu berechnen.'], ['Net total = sum of lines − allowances + charges.', 'Recalculate BT-109.']),
  'BR-CO-14': E('BT-110', ['Die Umsatzsteuer gesamt muss der Summe der Steuerbeträge je Satz entsprechen.', 'BT-110 aus der Steueraufschlüsselung neu berechnen.'], ['The VAT total must equal the sum of tax per rate.', 'Recalculate BT-110 from the VAT breakdown.']),
  'BR-CO-15': E('BT-112', ['Bruttobetrag = Nettobetrag + Umsatzsteuer.', 'BT-112 neu berechnen.'], ['Gross total = net total + VAT.', 'Recalculate BT-112.']),
  'BR-CO-16': E('BT-115', ['Zahlbetrag = Bruttobetrag − bereits gezahlt + Rundung.', 'BT-115 neu berechnen; Anzahlungen gehören in BT-113.'], ['Amount due = gross total − paid amount + rounding.', 'Recalculate BT-115; prepayments belong in BT-113.']),
  'BR-CO-17': E('BT-117', ['Steuerbetrag = Bemessungsgrundlage × Steuersatz, auf zwei Stellen gerundet.', 'Steuerbetrag der betroffenen Kategorie neu berechnen.'], ['Tax amount = taxable amount × rate, rounded to two decimals.', 'Recalculate the tax for that category.']),
  'BR-CO-18': E('BG-23', ['Jede Rechnung braucht mindestens eine Zeile in der Steueraufschlüsselung, auch bei steuerfreien Umsätzen.', 'Steueraufschlüsselung (BG-23) mit Kategorie, Satz, Grundlage und Betrag ergänzen.'], ['Every invoice needs at least one VAT breakdown, even for exempt supplies.', 'Add a VAT breakdown (BG-23) with category, rate, base and amount.']),
  'BR-CO-19': E('BG-14', ['Ist ein Abrechnungszeitraum angegeben, braucht er ein Start- oder Enddatum.', 'Datum ergänzen oder die leere Gruppe entfernen.'], ['An invoicing period needs a start or end date.', 'Add a date or remove the empty group.']),
  'BR-CO-20': E('BG-26', ['Ist ein Zeitraum für eine Position angegeben, braucht er ein Start- oder Enddatum.', 'Datum ergänzen oder die leere Gruppe entfernen.'], ['A line period needs a start or end date.', 'Add a date or remove the empty group.']),
  'BR-CO-26': E('BT-29, BT-30, BT-31', ['Damit der Käufer den Verkäufer automatisch erkennt, braucht es eine Kennung, eine Registernummer oder eine USt-IdNr.', 'USt-IdNr. (BT-31) oder Handelsregisternummer (BT-30) ergänzen.'], ['For the buyer to identify the seller automatically, a seller ID, legal registration ID or VAT ID is required.', 'Add the VAT ID (BT-31) or company registration number (BT-30).']),

  'BR-S-09': E('BT-117', ['Steuer zum Normalsatz = Bemessungsgrundlage × Steuersatz.', 'Steuerbetrag je Steuersatz neu berechnen.'], ['Standard-rated tax = taxable amount × rate.', 'Recalculate the tax per rate.']),
  'BR-IC-11': E('BT-72, BG-14', ['Bei innergemeinschaftlichen Lieferungen muss ein Lieferdatum oder ein Abrechnungszeitraum angegeben sein.', 'Lieferdatum (BT-72) oder Zeitraum (BG-14) ergänzen.'], ['Intra-community supplies need a delivery date or an invoicing period.', 'Add the delivery date (BT-72) or period (BG-14).']),
  'BR-IC-12': E('BT-80', ['Bei innergemeinschaftlichen Lieferungen muss das Lieferland angegeben sein.', 'Lieferanschrift mit Ländercode (BT-80) ergänzen.'], ['Intra-community supplies need the deliver-to country.', 'Add a deliver-to address with country code (BT-80).']),
  'BR-O-11': E('BG-23', ['Enthält eine Rechnung nicht steuerbare Umsätze (O), darf es keine weitere Steuerkategorie geben.', 'Andere Umsätze in einer eigenen Rechnung abrechnen.'], ['An invoice with “not subject to VAT” (O) must not contain other VAT categories.', 'Invoice other supplies separately.']),
  'BR-O-12': E('BT-151', ['Bei nicht steuerbaren Umsätzen (O) müssen alle Positionen die Kategorie O haben.', 'Kategorie der Positionen anpassen oder getrennt abrechnen.'], ['With “not subject to VAT” (O) every line must use category O.', 'Adjust the line categories or invoice separately.']),

  'BR-CL-01': E('BT-3', ['Der Rechnungsart-Code muss aus der Liste UNTDID 1001 stammen.', 'Gültigen Code setzen, meist 380.'], ['The type code must come from UNTDID 1001.', 'Use a valid code, usually 380.']),
  'BR-CL-03': E('currencyID', ['Jede Währungsangabe an Beträgen muss ein gültiger ISO-4217-Code sein.', 'currencyID-Attribute prüfen, z. B. EUR.'], ['Every currencyID on amounts must be a valid ISO 4217 code.', 'Check the currencyID attributes, e.g. EUR.']),
  'BR-CL-04': E('BT-5', ['Die Rechnungswährung muss ein gültiger ISO-4217-Code sein.', 'Gültigen Code wie EUR setzen.'], ['The invoice currency must be a valid ISO 4217 code.', 'Use a valid code such as EUR.']),
  'BR-CL-14': E('BT-40, BT-55, BT-80', ['Ländercodes müssen nach ISO 3166-1 angegeben sein (zwei Großbuchstaben).', 'Code wie DE, AT oder FR verwenden, nicht den Ländernamen.'], ['Country codes must follow ISO 3166-1 (two capital letters).', 'Use codes such as DE, AT or FR, not country names.']),
  'BR-CL-16': E('BT-81', ['Der Code für die Zahlungsart muss aus UNTDID 4461 stammen.', 'Gültigen Code setzen, z. B. 58 (SEPA-Überweisung) oder 59 (SEPA-Lastschrift).'], ['The payment means code must come from UNTDID 4461.', 'Use a valid code, e.g. 58 (SEPA credit transfer) or 59 (SEPA direct debit).']),
  'BR-CL-17': E('BT-95, BT-102, BT-151', ['Steuerkategorien müssen aus UNTDID 5305 stammen.', 'Gültige Kategorie setzen: S, Z, E, AE, K, G, O, L oder M.'], ['VAT categories must come from UNTDID 5305.', 'Use a valid category: S, Z, E, AE, K, G, O, L or M.']),
  'BR-CL-23': E('BT-130', ['Einheiten müssen als Code nach UN/ECE Rec. 20/21 angegeben sein.', 'Code statt Klartext verwenden: C62 statt „Stk“, HUR statt „Std“, KGM statt „kg“.'], ['Units must be UN/ECE Rec. 20/21 codes.', 'Use codes instead of text: C62 for pieces, HUR for hours, KGM for kilograms.']),
  'BR-CL-25': E('BT-34, BT-49', ['Das Schema einer elektronischen Adresse muss aus der EAS-Codeliste stammen.', 'Schema-ID prüfen, z. B. EM (E-Mail), 0204 (Leitweg-ID), 9930 (deutsche USt-IdNr.).'], ['The scheme of an electronic address must come from the EAS code list.', 'Check the scheme, e.g. EM (e-mail), 0204 (Leitweg-ID).']),

  'BR-DE-1': E('BG-16', ['Eine XRechnung muss Zahlungsanweisungen enthalten.', 'Zahlungsart und Bankverbindung (BG-16) angeben.'], ['An XRechnung must contain payment instructions.', 'Add payment means and bank details (BG-16).']),
  'BR-DE-2': E('BG-6', ['Eine XRechnung braucht einen Ansprechpartner des Verkäufers mit Name, Telefon und E-Mail.', 'Kontaktgruppe BG-6 vollständig ausfüllen.'], ['An XRechnung needs a seller contact with name, phone and e-mail.', 'Fill in the contact group BG-6 completely.']),
  'BR-DE-3': E('BT-37', ['Der Ort des Verkäufers ist in der XRechnung Pflicht.', 'Ort in BT-37 eintragen.'], ['The seller’s city is mandatory in XRechnung.', 'Enter the city in BT-37.']),
  'BR-DE-4': E('BT-38', ['Die Postleitzahl des Verkäufers ist in der XRechnung Pflicht.', 'PLZ in BT-38 eintragen.'], ['The seller’s post code is mandatory in XRechnung.', 'Enter the post code in BT-38.']),
  'BR-DE-5': E('BT-41', ['Der Name des Ansprechpartners beim Verkäufer ist Pflicht.', 'Name oder Abteilung in BT-41 eintragen.'], ['The seller contact’s name is mandatory.', 'Enter a name or department in BT-41.']),
  'BR-DE-6': E('BT-42', ['Die Telefonnummer des Ansprechpartners ist Pflicht.', 'Telefonnummer in BT-42 eintragen.'], ['The seller contact’s phone number is mandatory.', 'Enter the phone number in BT-42.']),
  'BR-DE-7': E('BT-43', ['Die E-Mail-Adresse des Ansprechpartners ist Pflicht.', 'E-Mail-Adresse in BT-43 eintragen.'], ['The seller contact’s e-mail is mandatory.', 'Enter the e-mail address in BT-43.']),
  'BR-DE-8': E('BT-52', ['Der Ort des Käufers ist in der XRechnung Pflicht.', 'Ort in BT-52 eintragen.'], ['The buyer’s city is mandatory in XRechnung.', 'Enter the city in BT-52.']),
  'BR-DE-9': E('BT-53', ['Die Postleitzahl des Käufers ist in der XRechnung Pflicht.', 'PLZ in BT-53 eintragen.'], ['The buyer’s post code is mandatory in XRechnung.', 'Enter the post code in BT-53.']),
  'BR-DE-10': E('BT-77', ['Ist eine Lieferanschrift angegeben, braucht sie einen Ort.', 'Ort in BT-77 eintragen.'], ['A deliver-to address needs a city.', 'Enter the city in BT-77.']),
  'BR-DE-11': E('BT-78', ['Ist eine Lieferanschrift angegeben, braucht sie eine Postleitzahl.', 'PLZ in BT-78 eintragen.'], ['A deliver-to address needs a post code.', 'Enter the post code in BT-78.']),
  'BR-DE-14': E('BT-119', ['In der XRechnung braucht jede Zeile der Steueraufschlüsselung einen Steuersatz, auch 0.', 'Steuersatz in BT-119 eintragen.'], ['In XRechnung every VAT breakdown needs a rate, even 0.', 'Enter the rate in BT-119.']),
  'BR-DE-15': E('BT-10', ['Die Käuferreferenz ist in der XRechnung Pflicht; bei Behörden ist das die Leitweg-ID.', 'Leitweg-ID oder die vom Käufer vorgegebene Referenz in BT-10 eintragen.'], ['The buyer reference is mandatory in XRechnung; for public buyers it is the Leitweg-ID.', 'Enter the Leitweg-ID or the buyer’s reference in BT-10.']),
  'BR-DE-16': E('BT-31, BT-32, BG-11', ['Bei steuerpflichtigen Umsätzen braucht der Verkäufer eine USt-IdNr., eine Steuernummer oder einen Steuervertreter.', 'USt-IdNr. (BT-31) oder Steuernummer (BT-32) ergänzen.'], ['For taxable supplies the seller needs a VAT ID, a tax number or a tax representative.', 'Add the VAT ID (BT-31) or tax number (BT-32).']),
  'BR-DE-17': W('BT-3', ['XRechnung sieht nur die Rechnungsarten 326, 380, 381, 384, 389, 875, 876 und 877 vor.', 'Passenden Code wählen, meist 380 oder für Gutschriften 381.'], ['XRechnung only provides for type codes 326, 380, 381, 384, 389, 875, 876 and 877.', 'Choose a fitting code, usually 380, or 381 for credit notes.']),
  'BR-DE-18': E('BT-20', ['Skonto muss in den Zahlungsbedingungen in einem festen Format stehen: #SKONTO#TAGE=14#PROZENT=2.00#, jede Angabe in einer eigenen Zeile mit Zeilenumbruch am Ende.', 'Skontozeilen genau nach diesem Muster schreiben, Prozent mit Punkt und zwei Nachkommastellen.'], ['Early-payment discounts must use a fixed format in the payment terms: #SKONTO#TAGE=14#PROZENT=2.00#, one per line, ending with a line break.', 'Write the discount lines exactly in that pattern, percentage with a dot and two decimals.']),
  'BR-DE-19': W('BT-84', ['Bei SEPA-Überweisung (Code 58) soll eine gültige IBAN angegeben sein.', 'IBAN prüfen.'], ['For SEPA credit transfer (code 58) a valid IBAN should be given.', 'Check the IBAN.']),
  'BR-DE-20': W('BT-91', ['Bei SEPA-Lastschrift (Code 59) soll das belastete Konto eine gültige IBAN sein.', 'IBAN des Zahlers prüfen.'], ['For SEPA direct debit (code 59) the debited account should be a valid IBAN.', 'Check the payer’s IBAN.']),
  'BR-DE-21': W('BT-24', ['Die Spezifikationskennung soll der Kennung von XRechnung entsprechen.', 'BT-24 auf urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0 setzen.'], ['The specification identifier should be the XRechnung identifier.', 'Set BT-24 to urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0.']),
  'BR-DE-22': E('BT-125', ['Die Dateinamen eingebetteter Anhänge müssen eindeutig sein.', 'Doppelte Anhänge umbenennen.'], ['File names of embedded attachments must be unique.', 'Rename duplicate attachments.']),
  'BR-DE-23-a': E('BG-17', ['Bei Überweisung (Code 30 oder 58) müssen die Kontodaten (BG-17) angegeben sein.', 'IBAN des Zahlungsempfängers ergänzen.'], ['For credit transfer (code 30 or 58) the account details (BG-17) must be given.', 'Add the payee’s IBAN.']),
  'BR-DE-23-b': E('BG-18, BG-19', ['Bei Überweisung dürfen keine Karten- oder Lastschriftdaten angegeben sein.', 'Karten- bzw. Lastschriftangaben entfernen oder eine eigene Zahlungsanweisung anlegen.'], ['With credit transfer, no card or direct-debit data may be given.', 'Remove the card or direct-debit data or use a separate payment instruction.']),
  'BR-DE-24-a': E('BG-18', ['Bei Kartenzahlung (Code 48, 54, 55) müssen Kartendaten angegeben sein.', 'Gekürzte Kartennummer (BT-87) ergänzen.'], ['For card payment (code 48, 54, 55) card data must be given.', 'Add the shortened card number (BT-87).']),
  'BR-DE-24-b': E('BG-17, BG-19', ['Bei Kartenzahlung dürfen keine Überweisungs- oder Lastschriftdaten angegeben sein.', 'Überflüssige Angaben entfernen.'], ['With card payment, no credit-transfer or direct-debit data may be given.', 'Remove the extra data.']),
  'BR-DE-25-a': E('BG-19', ['Bei SEPA-Lastschrift (Code 59) müssen Lastschriftdaten angegeben sein.', 'Mandatsreferenz (BT-89) und IBAN des Zahlers (BT-91) ergänzen.'], ['For SEPA direct debit (code 59) direct-debit data must be given.', 'Add the mandate reference (BT-89) and the payer’s IBAN (BT-91).']),
  'BR-DE-25-b': E('BG-17, BG-18', ['Bei Lastschrift dürfen keine Überweisungs- oder Kartendaten angegeben sein.', 'Überflüssige Angaben entfernen.'], ['With direct debit, no credit-transfer or card data may be given.', 'Remove the extra data.']),
  'BR-DE-26': W('BG-3', ['Eine Rechnungskorrektur (384) soll auf die ursprüngliche Rechnung verweisen.', 'Nummer und Datum der korrigierten Rechnung in BG-3 angeben.'], ['A corrected invoice (384) should reference the original invoice.', 'Give the number and date of the corrected invoice in BG-3.']),
  'BR-DE-27': W('BT-42', ['Die Telefonnummer soll mindestens drei Ziffern enthalten.', 'Vollständige Telefonnummer eintragen.'], ['The phone number should contain at least three digits.', 'Enter the full phone number.']),
  'BR-DE-28': W('BT-43', ['Die E-Mail-Adresse soll ein gültiges Format haben: genau ein @, keine Leerzeichen.', 'E-Mail-Adresse korrigieren.'], ['The e-mail address should be well-formed: exactly one @, no spaces.', 'Correct the e-mail address.']),
  'BR-DE-30': E('BT-90', ['Bei Lastschrift muss die Gläubiger-Identifikationsnummer angegeben sein.', 'Gläubiger-ID (BT-90) ergänzen.'], ['For direct debit the creditor identifier must be given.', 'Add the creditor ID (BT-90).']),
  'BR-DE-31': E('BT-91', ['Bei Lastschrift muss das zu belastende Konto angegeben sein.', 'IBAN des Zahlers (BT-91) ergänzen.'], ['For direct debit the debited account must be given.', 'Add the payer’s IBAN (BT-91).']),
  'BR-DE-TMP-32': W('BT-72, BG-14, BG-26', ['Die Rechnung soll das Liefer- oder Leistungsdatum nennen, als Datum, als Zeitraum oder je Position.', 'Lieferdatum (BT-72) oder Leistungszeitraum (BG-14) ergänzen; das verlangt auch § 14 Abs. 4 UStG.'], ['The invoice should state the delivery or service date, as a date, a period or per line.', 'Add the delivery date (BT-72) or the period (BG-14).']),
};

/* VAT category rules follow the same pattern for every category; the texts are built from templates. */
const CATS: Record<string, { de: string; en: string; zero: boolean; reason: boolean; ids: { de: string; en: string } }> = {
  S: { de: 'Normalsatz (S)', en: 'standard rate (S)', zero: false, reason: false, ids: { de: 'USt-IdNr., Steuernummer oder Steuervertreter des Verkäufers', en: 'seller VAT ID, tax number or tax representative' } },
  Z: { de: 'Nullsatz (Z)', en: 'zero rate (Z)', zero: true, reason: false, ids: { de: 'USt-IdNr., Steuernummer oder Steuervertreter des Verkäufers', en: 'seller VAT ID, tax number or tax representative' } },
  E: { de: 'steuerbefreit (E)', en: 'exempt (E)', zero: true, reason: true, ids: { de: 'USt-IdNr., Steuernummer oder Steuervertreter des Verkäufers', en: 'seller VAT ID, tax number or tax representative' } },
  AE: { de: 'Reverse Charge (AE)', en: 'reverse charge (AE)', zero: true, reason: true, ids: { de: 'eine Steuerkennung des Verkäufers und die USt-IdNr. oder Registernummer des Käufers', en: 'a seller tax ID and the buyer’s VAT ID or legal registration ID' } },
  IC: { de: 'innergemeinschaftliche Lieferung (K)', en: 'intra-community supply (K)', zero: true, reason: true, ids: { de: 'die USt-IdNr. des Verkäufers (oder Steuervertreters) und die USt-IdNr. des Käufers', en: 'the seller’s (or representative’s) VAT ID and the buyer’s VAT ID' } },
  G: { de: 'Ausfuhr außerhalb der EU (G)', en: 'export outside the EU (G)', zero: true, reason: true, ids: { de: 'die USt-IdNr. des Verkäufers oder seines Steuervertreters', en: 'the VAT ID of the seller or its tax representative' } },
  O: { de: 'nicht steuerbar (O)', en: 'not subject to VAT (O)', zero: true, reason: true, ids: { de: 'keine USt-IdNr. von Verkäufer, Steuervertreter oder Käufer', en: 'no VAT ID of seller, representative or buyer' } },
};

for (const [key, c] of Object.entries(CATS)) {
  const p = `BR-${key}`;
  const one = key === 'S' ? { de: 'mindestens eine', en: 'at least one' } : { de: 'genau eine', en: 'exactly one' };
  BASE[`${p}-01`] = E('BG-23', [`Werden Umsätze mit „${c.de}“ abgerechnet, braucht die Steueraufschlüsselung ${one.de} Zeile dieser Kategorie.`, `Zeile mit Kategorie ${key === 'IC' ? 'K' : key} in BG-23 ergänzen bzw. zusammenfassen.`], [`Supplies at “${c.en}” need ${one.en} VAT breakdown of that category.`, `Add or merge the BG-23 entry for category ${key === 'IC' ? 'K' : key}.`]);
  BASE[`${p}-02`] =
    key === 'O'
      ? E('BT-31, BT-48, BT-63', [`Bei „${c.de}“ darf die Rechnung ${c.ids.de} enthalten.`, 'USt-IdNr. entfernen oder die Kategorie prüfen.'], [`With “${c.en}” the invoice must contain ${c.ids.en}.`, 'Remove the VAT IDs or check the category.'])
      : E('BT-31, BT-32, BT-48, BT-63', [`Bei „${c.de}“ braucht die Rechnung ${c.ids.de}.`, 'Fehlende Steuerkennung ergänzen.'], [`With “${c.en}” the invoice needs ${c.ids.en}.`, 'Add the missing tax identifier.']);
  const rate = key === 'S' ? { de: 'größer als 0 sein', en: 'be greater than 0' } : key === 'O' ? { de: 'fehlen', en: 'be absent' } : { de: '0 sein', en: 'be 0' };
  for (const [suffix, where, bt] of [
    ['05', { de: 'einer Position', en: 'of a line' }, 'BT-152'],
    ['06', { de: 'eines Nachlasses', en: 'of an allowance' }, 'BT-96'],
    ['07', { de: 'eines Zuschlags', en: 'of a charge' }, 'BT-103'],
  ] as const) {
    BASE[`${p}-${suffix}`] = E(bt, [`Bei „${c.de}“ muss der Steuersatz ${where.de} ${rate.de}.`, `Steuersatz in ${bt} korrigieren oder die Kategorie prüfen.`], [`With “${c.en}” the VAT rate ${where.en} must ${rate.en}.`, `Correct the rate in ${bt} or check the category.`]);
  }
  BASE[`${p}-08`] = E('BT-116', [`Die Bemessungsgrundlage für „${c.de}“ muss der Summe der Positionen dieser Kategorie${key === 'S' || key === 'Z' ? ' und dieses Satzes' : ''} abzüglich Nachlässen und zuzüglich Zuschlägen entsprechen.`, 'Bemessungsgrundlage neu berechnen.'], [`The taxable amount for “${c.en}” must equal the lines of that category${key === 'S' || key === 'Z' ? ' and rate' : ''} minus allowances plus charges.`, 'Recalculate the taxable amount.']);
  if (c.zero) BASE[`${p}-09`] = E('BT-117', [`Bei „${c.de}“ muss der Steuerbetrag 0 sein.`, 'Steuerbetrag auf 0 setzen oder die Kategorie prüfen.'], [`With “${c.en}” the tax amount must be 0.`, 'Set the tax to 0 or check the category.']);
  BASE[`${p}-10`] = c.reason
    ? E('BT-120, BT-121', [`Bei „${c.de}“ muss ein Befreiungsgrund angegeben sein, als Text oder Code.`, key === 'AE' ? 'Grund ergänzen, z. B. „Steuerschuldnerschaft des Leistungsempfängers“ oder den Code VATEX-EU-AE.' : 'Befreiungsgrund als Text (BT-120) oder Code (BT-121) ergänzen.'], [`With “${c.en}” an exemption reason must be given, as text or code.`, key === 'AE' ? 'Add the reason, e.g. “Reverse charge” or code VATEX-EU-AE.' : 'Add the reason as text (BT-120) or code (BT-121).'])
    : E('BT-120, BT-121', [`Bei „${c.de}“ darf kein Befreiungsgrund angegeben sein.`, 'Befreiungsgrund entfernen.'], [`With “${c.en}” no exemption reason may be given.`, 'Remove the exemption reason.']);
}

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
  BASE[id] = E(bt, [`Beträge in ${bt} dürfen höchstens zwei Nachkommastellen haben.`, 'Auf Cent runden. Mehr Stellen sind nur bei Einzelpreisen und Mengen erlaubt.'], [`Amounts in ${bt} may have at most two decimals.`, 'Round to cents. More decimals are allowed only for unit prices and quantities.']);
}

export const RULE_TEXTS: Readonly<Record<string, Entry>> = BASE;

export function ruleText(id: string, lang: RuleLang): { severity: 'error' | 'warning'; bt: string; msg: string; fix: string } {
  const e = BASE[id];
  if (!e) return { severity: 'error', bt: '', msg: id, fix: '' };
  // French (for France) lives in its own table; a rule without a French text falls back to English.
  const [msg, fix] = lang === 'fr' ? (RULE_TEXTS_FR[id] ?? e.en) : e[lang];
  return { severity: e.sev, bt: e.bt, msg, fix };
}
