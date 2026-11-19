/*
 * Facturae code lists with the Spanish and English wording of the official XSD (facturae.gob.es, Facturaev3_2_2.xml).
 * Unknown codes are shown as written.
 */
export type FeLang = 'es' | 'en';
type List = Record<string, { es: string; en: string }>;

export const TAX_TYPES: List = {
  '01': { es: 'IVA', en: 'VAT (IVA)' },
  '02': { es: 'IPSI', en: 'IPSI (Ceuta and Melilla)' },
  '03': { es: 'IGIC', en: 'IGIC (Canary Islands)' },
  '04': { es: 'IRPF', en: 'Personal income tax withholding (IRPF)' },
  '05': { es: 'Otro', en: 'Other' },
  '06': { es: 'ITPAJD', en: 'ITPAJD (transfer tax and stamp duty)' },
  '07': { es: 'IE', en: 'Excise duty (IE)' },
  '08': { es: 'Renta de aduanas', en: 'Customs duties' },
  '09': { es: 'IGTECM', en: 'IGTECM (Ceuta and Melilla)' },
  '10': { es: 'IECDPCAC', en: 'IECDPCAC (fuel, Canary Islands)' },
  '11': { es: 'IIIMAB', en: 'IIIMAB (Balearic Islands)' },
  '12': { es: 'ICIO', en: 'ICIO (construction tax)' },
  '13': { es: 'IMVDN', en: 'IMVDN (Navarre)' },
  '14': { es: 'IMSN', en: 'IMSN (Navarre)' },
  '15': { es: 'IMGSN', en: 'IMGSN (Navarre)' },
  '16': { es: 'IMPN', en: 'IMPN (Navarre)' },
  '17': { es: 'REIVA', en: 'REIVA (travel agencies)' },
  '18': { es: 'REIGIC', en: 'REIGIC (travel agencies)' },
  '19': { es: 'REIPSI', en: 'REIPSI (travel agencies)' },
  '20': { es: 'IPS', en: 'Insurance premium tax (IPS)' },
  '21': { es: 'RLEA', en: 'Surcharge for winding up insurers (RLEA)' },
  '22': { es: 'IVPEE', en: 'Electricity generation tax (IVPEE)' },
  '23': { es: 'Impuesto sobre combustible nuclear gastado', en: 'Spent nuclear fuel tax' },
  '24': { es: 'Impuesto sobre almacenamiento de combustible nuclear', en: 'Nuclear fuel storage tax' },
  '25': { es: 'IDEC', en: 'Tax on bank deposits (IDEC)' },
  '26': { es: 'Impuesto sobre las labores del tabaco (Canarias)', en: 'Tobacco excise (Canary Islands)' },
  '27': { es: 'IGFEI', en: 'Fluorinated gases tax (IGFEI)' },
  '28': { es: 'IRNR', en: 'Non-resident income tax (IRNR)' },
  '29': { es: 'Impuesto sobre Sociedades', en: 'Corporation tax' },
};

export const UNITS: List = {
  '01': { es: 'ud.', en: 'pcs' },
  '02': { es: 'h', en: 'h' },
  '03': { es: 'kg', en: 'kg' },
  '04': { es: 'l', en: 'l' },
  '05': { es: 'otros', en: 'other' },
  '06': { es: 'cajas', en: 'boxes' },
  '07': { es: 'bandejas', en: 'trays' },
  '08': { es: 'barriles', en: 'barrels' },
  '09': { es: 'bidones', en: 'jerricans' },
  '10': { es: 'bolsas', en: 'bags' },
  '11': { es: 'bombonas', en: 'carboys' },
  '12': { es: 'botellas', en: 'bottles' },
  '13': { es: 'botes', en: 'canisters' },
  '14': { es: 'tetra briks', en: 'Tetra Briks' },
  '15': { es: 'cl', en: 'cl' },
  '16': { es: 'cm', en: 'cm' },
  '17': { es: 'cubos', en: 'bins' },
  '18': { es: 'docenas', en: 'dozens' },
  '19': { es: 'estuches', en: 'cases' },
  '20': { es: 'garrafas', en: 'demijohns' },
  '21': { es: 'g', en: 'g' },
  '22': { es: 'km', en: 'km' },
  '23': { es: 'latas', en: 'cans' },
  '24': { es: 'manojos', en: 'bunches' },
  '25': { es: 'm', en: 'm' },
  '26': { es: 'mm', en: 'mm' },
  '27': { es: '6-packs', en: '6-packs' },
  '28': { es: 'paquetes', en: 'packages' },
  '29': { es: 'raciones', en: 'portions' },
  '30': { es: 'rollos', en: 'rolls' },
  '31': { es: 'sobres', en: 'envelopes' },
  '32': { es: 'tarrinas', en: 'tubs' },
  '33': { es: 'm³', en: 'm³' },
  '34': { es: 's', en: 's' },
  '35': { es: 'W', en: 'W' },
  '36': { es: 'kWh', en: 'kWh' },
};

export const PAYMENT_MEANS: List = {
  '01': { es: 'Al contado', en: 'In cash' },
  '02': { es: 'Recibo domiciliado', en: 'Direct debit' },
  '03': { es: 'Recibo', en: 'Receipt' },
  '04': { es: 'Transferencia', en: 'Credit transfer' },
  '05': { es: 'Letra aceptada', en: 'Accepted bill of exchange' },
  '06': { es: 'Crédito documentario', en: 'Documentary credit' },
  '07': { es: 'Contrato adjudicación', en: 'Contract award' },
  '08': { es: 'Letra de cambio', en: 'Bill of exchange' },
  '09': { es: 'Pagaré a la orden', en: 'Transferable promissory note' },
  '10': { es: 'Pagaré no a la orden', en: 'Non-transferable promissory note' },
  '11': { es: 'Cheque', en: 'Cheque' },
  '12': { es: 'Reposición', en: 'Open account reimbursement' },
  '13': { es: 'Especiales', en: 'Special payment' },
  '14': { es: 'Compensación', en: 'Set-off' },
  '15': { es: 'Giro postal', en: 'Postal giro' },
  '16': { es: 'Cheque conformado', en: 'Certified cheque' },
  '17': { es: 'Cheque bancario', en: 'Banker’s draft' },
  '18': { es: 'Pago contra reembolso', en: 'Cash on delivery' },
  '19': { es: 'Pago mediante tarjeta', en: 'Card payment' },
};

export const DOC_TYPES: List = {
  FC: { es: 'Factura completa', en: 'Full invoice' },
  FA: { es: 'Factura simplificada (abreviada)', en: 'Simplified invoice' },
  AF: { es: 'Autofactura', en: 'Self-billed invoice' },
};

export const INVOICE_CLASSES: List = {
  OO: { es: 'Original', en: 'Original' },
  OR: { es: 'Rectificativa', en: 'Corrective invoice' },
  OC: { es: 'Recapitulativa', en: 'Summary invoice' },
  CO: { es: 'Copia de la original', en: 'Copy of the original' },
  CR: { es: 'Copia de la rectificativa', en: 'Copy of the corrective invoice' },
  CC: { es: 'Copia de la recapitulativa', en: 'Copy of the summary invoice' },
};

/** The XSD names the roles Fiscal, Receptor, Pagador, Comprador; Orden HAP/1074/2014 maps the first three to the DIR3 units FACe needs. */
export const ROLES: List = {
  '01': { es: 'Oficina contable (Fiscal)', en: 'Accounting office (Fiscal)' },
  '02': { es: 'Órgano gestor (Receptor)', en: 'Managing body (Receptor)' },
  '03': { es: 'Unidad tramitadora (Pagador)', en: 'Processing unit (Pagador)' },
  '04': { es: 'Órgano proponente (Comprador)', en: 'Proposing body (Comprador)' },
  '05': { es: 'Cobrador', en: 'Collector' },
  '06': { es: 'Vendedor', en: 'Seller' },
  '07': { es: 'Receptor del pago', en: 'Payment receiver' },
  '08': { es: 'Receptor del cobro', en: 'Collection receiver' },
  '09': { es: 'Emisor', en: 'Issuer' },
};

export const ISSUER_TYPES: List = {
  EM: { es: 'Emitida por el proveedor', en: 'Issued by the seller' },
  RE: { es: 'Emitida por el cliente (autofactura)', en: 'Issued by the buyer (self-billing)' },
  TE: { es: 'Emitida por un tercero', en: 'Issued by a third party' },
};

export const REASONS: List = {
  '01': { es: 'Número de la factura', en: 'Invoice number' },
  '02': { es: 'Serie de la factura', en: 'Invoice series' },
  '03': { es: 'Fecha de expedición', en: 'Issue date' },
  '04': { es: 'Nombre o razón social del emisor', en: 'Issuer name' },
  '05': { es: 'Nombre o razón social del receptor', en: 'Receiver name' },
  '06': { es: 'Identificación fiscal del emisor', en: 'Issuer tax ID' },
  '07': { es: 'Identificación fiscal del receptor', en: 'Receiver tax ID' },
  '08': { es: 'Domicilio del emisor', en: 'Issuer address' },
  '09': { es: 'Domicilio del receptor', en: 'Receiver address' },
  '10': { es: 'Detalle de la operación', en: 'Item line' },
  '11': { es: 'Porcentaje impositivo', en: 'Tax rate' },
  '12': { es: 'Cuota tributaria', en: 'Tax amount' },
  '13': { es: 'Fecha o periodo', en: 'Date or period' },
  '14': { es: 'Clase de factura', en: 'Invoice class' },
  '15': { es: 'Literales legales', en: 'Legal literals' },
  '16': { es: 'Base imponible', en: 'Taxable base' },
  '80': { es: 'Cálculo de cuotas repercutidas', en: 'Calculation of output tax' },
  '81': { es: 'Cálculo de cuotas retenidas', en: 'Calculation of withheld tax' },
  '82': { es: 'Base modificada por devolución de envases', en: 'Base changed by returned packaging' },
  '83': { es: 'Base modificada por descuentos y bonificaciones', en: 'Base changed by discounts and rebates' },
  '84': { es: 'Base modificada por resolución firme', en: 'Base changed by a final court or administrative ruling' },
  '85': { es: 'Base modificada por cuotas no satisfechas (concurso)', en: 'Base changed by unpaid tax in insolvency' },
};

export const CORRECTION_METHODS: List = {
  '01': { es: 'Rectificación íntegra', en: 'Full correction' },
  '02': { es: 'Rectificación por diferencias', en: 'Correction by differences' },
  '03': { es: 'Rectificación por descuento por volumen de operaciones', en: 'Volume discount over a period' },
  '04': { es: 'Autorizada por la Agencia Tributaria', en: 'Authorised by the Tax Agency' },
};

export const SPECIAL_EVENTS: List = {
  '01': { es: 'Operación sujeta y exenta', en: 'Subject and exempt' },
  '02': { es: 'Operación no sujeta', en: 'Not subject to tax' },
};

export function feLabel(list: List, code: string, lang: FeLang): string {
  return list[code]?.[lang] ?? '';
}
