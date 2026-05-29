import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size    = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width:           32,
          height:          32,
          borderRadius:    8,
          background:      '#16a34a',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
        }}
      >
        <span
          style={{
            color:       'white',
            fontSize:    20,
            fontWeight:  900,
            lineHeight:  1,
            fontFamily:  'sans-serif',
          }}
        >
          N
        </span>
      </div>
    ),
    { width: 32, height: 32 },
  );
}
