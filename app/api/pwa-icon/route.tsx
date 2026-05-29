import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

/**
 * Genera íconos PWA de alta calidad con el diseño de marca de Nutri Smart CR.
 * Usado por manifest.json para los íconos de instalación PWA.
 *
 * Uso: /api/pwa-icon?s=192  →  imagen PNG de 192×192
 *      /api/pwa-icon?s=512  →  imagen PNG de 512×512
 */
export function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const size = Number(searchParams.get('s') ?? '192');
  const dim  = [72, 96, 128, 192, 384, 512].includes(size) ? size : 192;

  // Escalar elementos proporcionales al tamaño
  const r         = Math.round(dim * 0.22);   // border-radius
  const fontSize  = Math.round(dim * 0.60);   // letra N
  const leafSize  = Math.round(dim * 0.18);   // hoja decorativa
  const leafX     = Math.round(dim * 0.56);
  const leafY     = Math.round(dim * 0.14);

  return new ImageResponse(
    (
      <div
        style={{
          width:          dim,
          height:         dim,
          borderRadius:   r,
          background:     'linear-gradient(145deg, #22c55e 0%, #16a34a 45%, #15803d 100%)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          position:       'relative',
          overflow:       'hidden',
        }}
      >
        {/* Reflejo de luz superior */}
        <div
          style={{
            position:     'absolute',
            top:          0,
            left:         0,
            right:        0,
            height:       `${dim * 0.45}px`,
            background:   'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 100%)',
            borderRadius: `${r}px ${r}px 50% 50%`,
          }}
        />

        {/* Hoja decorativa (esquina superior derecha) */}
        <div
          style={{
            position:     'absolute',
            top:          leafY,
            right:        leafX * 0.15,
            width:        leafSize,
            height:       leafSize * 1.4,
            background:   'rgba(255,255,255,0.20)',
            borderRadius: `${leafSize * 0.7}px ${leafSize * 0.1}px ${leafSize * 0.7}px ${leafSize * 0.1}px`,
            transform:    'rotate(35deg)',
          }}
        />

        {/* Letra N */}
        <span
          style={{
            color:          'white',
            fontSize:       fontSize,
            fontWeight:     900,
            lineHeight:     1,
            fontFamily:     'sans-serif',
            letterSpacing:  `-${Math.round(dim * 0.02)}px`,
            textShadow:     `0 ${Math.round(dim * 0.02)}px ${Math.round(dim * 0.04)}px rgba(0,0,0,0.25)`,
            position:       'relative',
            zIndex:         1,
          }}
        >
          N
        </span>
      </div>
    ),
    {
      width:  dim,
      height: dim,
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    },
  );
}
