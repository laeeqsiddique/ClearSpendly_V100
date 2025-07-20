import { ImageResponse } from 'next/og'
 
// Route segment config
export const runtime = 'edge'
 
// Image metadata
export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'
 
// Image generation
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #9333ea 0%, #2563eb 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '6px',
        }}
      >
        <div
          style={{
            background: 'white',
            width: '20px',
            height: '24px',
            borderRadius: '2px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1px',
          }}
        >
          <div style={{ background: '#9333ea', width: '14px', height: '1px', borderRadius: '0.5px' }} />
          <div style={{ background: '#9333ea', width: '10px', height: '1px', borderRadius: '0.5px' }} />
          <div style={{ background: '#9333ea', width: '12px', height: '1px', borderRadius: '0.5px' }} />
          <div style={{ background: '#9333ea', width: '8px', height: '1px', borderRadius: '0.5px' }} />
          <div style={{ background: '#2563eb', width: '14px', height: '2px', borderRadius: '1px', marginTop: '2px' }} />
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
