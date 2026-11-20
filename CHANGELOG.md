# Changelog

## 0.1.1 (2026-11-21)

- Fix: the fix hint for BR-E-10, BR-IC-10, BR-G-10 and BR-O-10 no longer suggests “Reverse charge” / `VATEX-EU-AE`, which only applies to category AE. Those rules now ask for the exemption reason as text (BT-120) or code (BT-121), in German, English and French. BR-AE-10 keeps the example.

## 0.1.0 (2026-11-20)

First release. Parsers for UBL 2.1 and CII (XRechnung, ZUGFeRD 1.0/2.x, Factur-X, Peppol BIS Billing 3.0), FatturaPA 1.2, Facturae 3.x and KSeF FA(2)/FA(3); plausibility checks; 192 EN 16931 and XRechnung business rules in German, English and French; CAdES `.p7m` unwrapping and XAdES `.xsig` reading.
