import { ImageResponse } from 'next/og'
 
// Route segment config
export const runtime = 'edge'
 
// Image metadata
export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'
 
// Image generation
export default function AppleIcon() {
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
          borderRadius: '32px',
        }}
      >
        <div
          style={{
            background: 'white',
            width: '100px',
            height: '120px',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '16px',
          }}
        >
          <div style={{ background: '#9333ea', width: '70px', height: '4px', borderRadius: '2px' }} />
          <div style={{ background: '#9333ea', width: '50px', height: '4px', borderRadius: '2px' }} />
          <div style={{ background: '#9333ea', width: '60px', height: '4px', borderRadius: '2px' }} />
          <div style={{ background: '#9333ea', width: '40px', height: '4px', borderRadius: '2px' }} />
          <div style={{ background: '#9333ea', width: '55px', height: '4px', borderRadius: '2px' }} />
          <div style={{ background: '#2563eb', width: '70px', height: '8px', borderRadius: '4px', marginTop: '8px' }} />
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
