'use client'

import { AVATARS } from '@/lib/avatars'
import { FRAME_MAP } from '@/lib/frames'
import { BG_MAP } from '@/lib/avatarBackgrounds'
import { getTitle } from '@/lib/titles'

// Mapping de id de título → color hex para el badge en la tarjeta
// (Title.color guarda Tailwind classes que no sirven en inline styles).
const TITLE_HEX: Record<string, string> = {
  novato:    '#9ca3af',
  aprendiz:  '#34d399',
  guerrero:  '#fbbf24',
  profeta:   '#a78bfa',
  campeon:   '#f97316',
  leyenda:   '#06b6d4',
  invencible:'#ec4899',
  rey:       '#fde047',
}

export type ShareCardData = {
  username:   string
  first_name: string
  last_name:  string
  avatar_url: string | null
  frame:      string | null
  avatar_bg:  string | null
  title:      string | null
  bio:        string | null
  total_score: number
  wins:       number
  streak_days: number
  level:      number
  favorite_verse:     string
  favorite_verse_ref: string
}

// Tarjeta 800x450 que se renderiza off-screen y se captura con html2canvas-pro.
// Evita variables CSS y usa colores hex directos para máxima compatibilidad
// con el motor de captura. Las animaciones de marco y los GIFs se congelan
// como un cuadro fijo en el PNG resultante (comportamiento esperado).
export default function ShareCard({
  data, churchEmoji, churchName, clan, completedChapters,
}: {
  data: ShareCardData
  churchEmoji: string | null
  churchName:  string | null
  clan: { name: string; shield_color: string | null; shield_bg: string | null; shield_icon: string | null } | null
  completedChapters: number
}) {
  const title  = getTitle(data.title)
  const avatar = data.avatar_url ? AVATARS[data.avatar_url] : null
  const frame  = data.frame ? FRAME_MAP[data.frame] : null
  const bg     = data.avatar_bg ? BG_MAP[data.avatar_bg] : null

  // Render del avatar (150px). Maneja imagen PNG, GIF bg, color sólido.
  const avatarBgStyle: React.CSSProperties = bg?.image
    ? { backgroundImage: `url('${bg.image}')`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : avatar
      ? { backgroundColor: avatar.bg }
      : { backgroundColor: '#7c3aed' }

  const frameBoxShadow = frame?.previewColor
    ? `0 0 0 5px ${frame.previewColor}, 0 0 24px 6px ${frame.previewColor}99`
    : '0 0 0 4px #7c3aed, 0 0 18px 4px rgba(124,58,237,0.5)'

  return (
    <div
      style={{
        width: 800,
        height: 450,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 24,
        background: 'radial-gradient(ellipse at top left, #1e0b4e 0%, #0f0a2e 50%, #050310 100%)',
        boxShadow: 'inset 0 0 60px rgba(124,58,237,0.35), 0 0 0 4px #fbbf24, 0 0 32px rgba(251,191,36,0.45)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#ffffff',
      }}
    >
      {/* Estrellitas decorativas (puntos blancos pseudo-aleatorios) */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {STAR_POSITIONS.map((s, i) => (
          <span
            key={i}
            style={{
              position: 'absolute', left: `${s.x}%`, top: `${s.y}%`,
              width: s.size, height: s.size,
              background: '#ffffff', borderRadius: '50%', opacity: s.o,
              boxShadow: `0 0 ${s.size * 2}px rgba(255,255,255,${s.o * 0.6})`,
            }}
          />
        ))}
      </div>

      {/* Logo arriba-izquierda */}
      <div style={{ position: 'absolute', top: 18, left: 22 }}>
        <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 28, letterSpacing: 1, color: '#22d3ee', textShadow: '0 0 12px rgba(34,211,238,0.7)' }}>
          #TREND
        </span>
        <span style={{ marginLeft: 6, fontSize: 11, color: '#c4b5fd' }}>· Bible Trivia</span>
      </div>

      {/* URL footer */}
      <div style={{ position: 'absolute', bottom: 14, right: 22, fontSize: 11, color: '#9ca3af' }}>
        Jugá en <span style={{ color: '#fde047' }}>trend-app-five.vercel.app</span>
      </div>

      {/* Avatar grande izquierda */}
      <div style={{ position: 'absolute', top: 70, left: 40 }}>
        <div
          style={{
            width: 150, height: 150, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', position: 'relative',
            boxShadow: frameBoxShadow,
            ...avatarBgStyle,
          }}
        >
          {avatar?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar.image} alt="avatar" crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : avatar ? (
            <span style={{ fontSize: 84, lineHeight: 1 }}>{avatar.emoji}</span>
          ) : (
            <span style={{ fontSize: 64, fontWeight: 'bold', color: '#fff' }}>
              {data.first_name?.[0]?.toUpperCase() ?? '?'}
            </span>
          )}
        </div>

        {/* Badge de nivel debajo del avatar */}
        <div
          style={{
            position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)',
            background: 'linear-gradient(to bottom, #fbbf24, #d97706)',
            color: '#1c1917',
            fontFamily: 'Bebas Neue, sans-serif', fontSize: 18, letterSpacing: 1,
            padding: '4px 14px', borderRadius: 999,
            boxShadow: '0 4px 12px rgba(251,191,36,0.5), 0 0 0 2px rgba(0,0,0,0.4)',
            whiteSpace: 'nowrap',
          }}
        >
          NIV. {data.level}
        </div>
      </div>

      {/* Bloque derecho: nombre, username, título, iglesia/clan */}
      <div style={{ position: 'absolute', top: 60, left: 220, right: 30 }}>
        <p style={{
          fontFamily: 'Bebas Neue, sans-serif', fontSize: 44, lineHeight: 1, margin: 0,
          color: '#ffffff', textShadow: '0 2px 10px rgba(0,0,0,0.7)',
          overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
        }}>
          {(data.first_name || '').toUpperCase()} {(data.last_name || '').toUpperCase()}
        </p>
        <p style={{ color: '#67e8f9', fontSize: 16, margin: '4px 0 0 0' }}>@{data.username}</p>

        {/* Título + iglesia + clan en línea */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <span
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 12px', borderRadius: 999,
              border: `2px solid ${TITLE_HEX[title.id] ?? '#a78bfa'}`,
              background: 'rgba(0,0,0,0.4)',
              color: TITLE_HEX[title.id] ?? '#fff',
              fontSize: 13, fontWeight: 700,
            }}
          >
            ⚔️ {title.label}
          </span>
          {churchName && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: 'rgba(245,158,11,0.18)', border: '1px solid rgba(251,191,36,0.55)',
              color: '#fde68a', padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
            }}>
              <span style={{ fontSize: 14 }}>{churchEmoji ?? '⛪'}</span>
              {churchName}
            </span>
          )}
          {clan && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: 'rgba(124,58,237,0.2)', border: `1px solid ${clan.shield_color ?? '#a78bfa'}`,
              color: '#e9d5ff', padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
            }}>
              <span style={{ fontSize: 14 }}>{clan.shield_icon ?? '⚔️'}</span>
              {clan.name}
            </span>
          )}
        </div>

        {/* Stats: 4 cards horizontales */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <StatBox icon="🏆" label="Puntaje" value={data.total_score} accent="#fde047" />
          <StatBox icon="⚔️" label="Victorias" value={data.wins} accent="#86efac" />
          <StatBox icon="📖" label="Capítulos" value={completedChapters} accent="#fcd34d" />
          <StatBox icon="🔥" label="Racha" value={data.streak_days} accent="#fb923c" />
        </div>

        {/* Bio + versículo favorito */}
        {data.bio && data.bio.trim() !== '' && (
          <p style={{
            marginTop: 14, color: '#e9d5ff', fontSize: 13, fontStyle: 'italic',
            fontFamily: 'Georgia, serif', lineHeight: 1.4,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            &ldquo;{data.bio}&rdquo;
          </p>
        )}
        {data.favorite_verse && data.favorite_verse.trim() !== '' && (
          <div style={{
            marginTop: 10,
            background: 'rgba(180,83,9,0.15)', border: '1px solid rgba(251,191,36,0.4)',
            borderRadius: 10, padding: '6px 10px',
          }}>
            <p style={{
              color: '#fde68a', fontSize: 12, fontStyle: 'italic',
              fontFamily: 'Georgia, serif', lineHeight: 1.35, margin: 0,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              &ldquo;{data.favorite_verse}&rdquo;
              {data.favorite_verse_ref && (
                <span style={{ display: 'block', textAlign: 'right', color: 'rgba(253,230,138,0.8)', fontSize: 10, marginTop: 2, fontStyle: 'normal' }}>
                  — {data.favorite_verse_ref}
                </span>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function StatBox({ icon, label, value, accent }: { icon: string; label: string; value: number | string; accent: string }) {
  return (
    <div style={{
      flex: 1,
      background: 'rgba(15,10,46,0.7)',
      border: '1px solid rgba(124,58,237,0.4)',
      borderRadius: 12, padding: '8px 6px', textAlign: 'center',
      minWidth: 0,
    }}>
      <div style={{ fontSize: 16, lineHeight: 1 }}>{icon}</div>
      <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, color: accent, lineHeight: 1, marginTop: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 9, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>{label}</div>
    </div>
  )
}

// Posiciones fijas de estrellas (no random para que el render sea determinístico
// y el snapshot html2canvas no varíe entre invocaciones).
const STAR_POSITIONS: Array<{ x: number; y: number; size: number; o: number }> = [
  { x:  4, y: 12, size: 2, o: 0.9 },
  { x: 12, y: 36, size: 1, o: 0.6 },
  { x: 23, y: 64, size: 2, o: 0.8 },
  { x: 35, y:  8, size: 1, o: 0.7 },
  { x: 48, y: 28, size: 2, o: 0.75 },
  { x: 60, y: 80, size: 1, o: 0.55 },
  { x: 72, y: 18, size: 2, o: 0.85 },
  { x: 84, y: 46, size: 1, o: 0.7 },
  { x: 92, y: 72, size: 2, o: 0.8 },
  { x:  8, y: 88, size: 1, o: 0.6 },
  { x: 28, y: 90, size: 2, o: 0.75 },
  { x: 56, y:  4, size: 1, o: 0.55 },
  { x: 78, y: 92, size: 1, o: 0.65 },
  { x: 96, y: 22, size: 2, o: 0.8 },
]
