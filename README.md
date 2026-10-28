# PLATIVEZDE — Success

Glass lowercase “success” grows into view and fills with green liquid. A finite shower of green paper confetti falls from above, then fades. The waterline has overlapping waves and a translucent meniscus. Each letter has its own inset liquid volume, with counters preserved.

The word grows in 0.4 seconds, finishes filling at 1.7 seconds, and the scene settles at 3.2 seconds. Replay and theme buttons are preview controls. Reduced motion shows the completed word immediately without falling confetti.

## Development

npm ci
npm run dev -- --port 5174

## Build

npm run build
npm run preview

## Palette

Backgrounds: light #FFFFFF, dark #131313.
Success liquid: light #16784A, dark #62D09A.
Figma history nodes: I1:11008;2:350 and I1:10966;96:4538 in qhOgTR3Z8vwlO90JR34Fus.

Three.js bundled Helvetiker Bold supplies the letter outlines. Assets are bundled locally; no external font request is required.
The approved loader remains separately in Andrei35531/Loader.

Bubbles reuse the loader's transparent sphere shader with a white Fresnel rim and crescent glint. Letter contours and holes constrain bubbles below the waterline. Confetti pieces have independently varied spawn times, heights, sizes, drift, depth and angular velocity.

## Error variant
The Error/Success button switches between two scenes and replays the selected animation while preserving the theme. Error uses glass error lettering, red liquid (#D83242 light / #FF6978 dark), the same bubbles and falling bevelled crosses. These red values are concept colours, not verified Figma tokens. Both variants respect reduced motion.
