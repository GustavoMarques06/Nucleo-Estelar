/** Retrato do ECO, o sistema da base: um visor ciano que pulsa, com ondas de rádio em volta (desenhado em SVG). */
export function EcoPortrait({ size = 96 }: { size?: number }) {
  return (
    <svg className="eco-portrait" width={size} height={size} viewBox="0 0 32 32" shapeRendering="crispEdges" role="img" aria-label="ECO">
      <rect width="32" height="32" fill="#070d1c" />
      {/* ondas de rádio */}
      <g className="eco-waves" fill="none" stroke="#00e5ff" strokeWidth="1">
        <path d="M4 10 Q1 16 4 22" /><path d="M28 10 Q31 16 28 22" />
        <path d="M7 12 Q5 16 7 20" opacity=".7" /><path d="M25 12 Q27 16 25 20" opacity=".7" />
      </g>
      {/* carcaça do painel */}
      <rect x="9" y="8" width="14" height="16" fill="#1e2a44" />
      <rect x="9" y="8" width="14" height="1" fill="#2f4366" />
      <rect x="9" y="23" width="14" height="1" fill="#0b1222" />
      {/* olho */}
      <rect x="11" y="12" width="10" height="8" fill="#03141c" />
      <rect className="eco-iris" x="13" y="13" width="6" height="6" fill="#00e5ff" />
      <rect x="15" y="15" width="2" height="2" fill="#eaffff" />
      {/* antena */}
      <rect x="15" y="4" width="2" height="4" fill="#2f4366" />
      <rect className="eco-led" x="15" y="3" width="2" height="1" fill="#ffb347" />
    </svg>
  );
}
