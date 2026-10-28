# PLATIVEZDE — Success concept

A standalone Three.js success animation matching the approved glass coin loader.

The 2.1-second sequence completes a coin turn, fills and settles the water, transitions from CTA blue to success green, reveals a bevelled glass checkmark and sweeps a highlight along the rim. It plays once and holds the completed state. Replay and theme buttons are preview controls. Reduced motion shows the final state immediately.

## Local development

npm ci
npm run dev -- --port 5174

## Production build

npm run build
npm run preview

## Figma colours

- Light background: #FFFFFF; dark background: #131313.
- CTA blue: light #1473E6, dark #579CFF.
- Success green: light #16784A, dark #62D09A.
- Green references: history nodes I1:11008;2:350 and I1:10966;96:4538 in file qhOgTR3Z8vwlO90JR34Fus.

This repository currently contains the success concept only. The approved loader remains in Andrei35531/Loader. No runtime accounts or external assets are required.
