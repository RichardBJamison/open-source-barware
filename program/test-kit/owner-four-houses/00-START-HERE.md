# Owner Four Houses — hardcore stress kit

Persona: brand-new multi-unit owner. Four establishments on one laptop install.
Spanish-speaking bartenders (mixed EN/ES notes). UI stays English.

| Code | House | Bars | Character |
|------|-------|------|-----------|
| H1 | Casa Dos Barras | 2 | Mexican restaurant — Spanish floor notes |
| H2 | El Rincón | 1 | Neighborhood cantina — almost all Spanish |
| H3 | Tres Salas | 3 | Hotel lobby + dining + rooftop |
| H4 | Cava & Champagne | 1 custom | Fine dining — wine cellar + 3 champagne coolers |

## Flow under test

1. Walk notes → parse → stations/bottles
2. Count notes (ES levels) → match map
3. Process cycle → metrics/analytics numbers
4. Multi-venue transfer (H1 main → patio)
5. POS + PO log
6. Staff board Spanish handoff
7. Venues consolidated roll-up

Run: `node program/scripts/run-owner-four-houses-stress.mjs`  
Uses isolated server on **port 5055** + `OSB_DATA_DIR=program/.stress-sandbox/data` (never touches live 5052 data).
