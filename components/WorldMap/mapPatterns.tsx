import React from 'react';
import { Defs, Pattern, Rect, Line } from 'react-native-svg';

// One shared <Defs> block included once in MapCanvas.
// Pattern IDs used by MapField based on owner + status.
export default function MapPatterns() {
  return (
    <Defs>
      {/* Soil base */}
      <Pattern id="soil" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
        <Rect width="80" height="80" fill="#110e09"/>
        <Rect x="0" y="0" width="40" height="40" fill="#130f0a" opacity="0.35"/>
      </Pattern>

      {/* Player — planted crops (horizontal rows) */}
      <Pattern id="p-player" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
        <Rect width="6" height="6" fill="#112210"/>
        <Line x1="0" y1="3" x2="6" y2="3" stroke="#1a3418" strokeWidth="1.6"/>
      </Pattern>

      {/* Player — ready to harvest (golden rows) */}
      <Pattern id="p-ready" x="0" y="0" width="5" height="5" patternUnits="userSpaceOnUse">
        <Rect width="5" height="5" fill="#2c3208"/>
        <Line x1="0" y1="2.5" x2="5" y2="2.5" stroke="#484e10" strokeWidth="1.2"/>
      </Pattern>

      {/* Player — unplanted */}
      <Pattern id="p-bare" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
        <Rect width="10" height="10" fill="#0c1609"/>
      </Pattern>

      {/* Hacienda Rivera (Rival A) */}
      <Pattern id="p-rivalA" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
        <Rect width="6" height="6" fill="#1e0808"/>
        <Line x1="0" y1="3" x2="6" y2="3" stroke="#2e1010" strokeWidth="1.5"/>
      </Pattern>
      <Pattern id="p-rivalA2" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
        <Rect width="6" height="6" fill="#190606"/>
        <Line x1="0" y1="3" x2="6" y2="3" stroke="#260e0e" strokeWidth="1.5"/>
      </Pattern>

      {/* Granja del Norte (Rival B) */}
      <Pattern id="p-rivalB" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
        <Rect width="6" height="6" fill="#09071e"/>
        <Line x1="0" y1="3" x2="6" y2="3" stroke="#121038" strokeWidth="1.5"/>
      </Pattern>
      <Pattern id="p-rivalB2" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
        <Rect width="6" height="6" fill="#0b0920"/>
        <Line x1="0" y1="3" x2="6" y2="3" stroke="#161240" strokeWidth="1.5"/>
      </Pattern>

      {/* For Sale */}
      <Pattern id="p-forsale" x="0" y="0" width="9" height="9" patternUnits="userSpaceOnUse">
        <Rect width="9" height="9" fill="#1a1400"/>
      </Pattern>

      {/* Unowned / wilderness */}
      <Pattern id="p-unowned" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
        <Rect width="10" height="10" fill="#0e0c08"/>
      </Pattern>
    </Defs>
  );
}
