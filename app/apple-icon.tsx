import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size    = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width:           180,
          height:          180,
          borderRadius:    40,
          background:      'linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #15803d 100%)',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          boxShadow:       'inset 0 -4px 12px rgba(0,0,0,0.15)',
        }}
      >
        <span
          style={{
            color:       'white',
            fontSize:    108,
            fontWeight:  900,
            lineHeight:  1,
            fontFamily:  'sans-serif',
            letterSpacing: '-4px',
          }}
        >
          N
        </span>
      </div>
    ),
    { width: 180, height: 180 },
  );
}
