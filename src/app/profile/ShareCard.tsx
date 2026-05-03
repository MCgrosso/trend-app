'use client'

import { AVATARS } from '@/lib/avatars'
import { FRAME_MAP } from '@/lib/frames'
import { BG_MAP } from '@/lib/avatarBackgrounds'
import { getTitle } from '@/lib/titles'

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

// Hex colors per title id (Title.color guarda Tailwind classes)
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

// Tarjeta 800x450 con layout en flexbox columnas. Sin posicionamiento absoluto
// salvo el badge "NIV." que cuelga del avatar. Cada bloque tiene su renglón
// dedicado para evitar superposiciones cuando html2canvas-pro hace el snapshot.
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

  const avatarBgStyle: React.CSSProperties = bg?.image
    ? { backgroundImage: `url('${bg.image}')`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : avatar
      ? { backgroundColor: avatar.bg }
      : { backgroundColor: '#7c3aed' }

  const frameBoxShadow = frame?.previewColor
    ? `0 0 0 4px ${frame.previewColor}, 0 0 18px 4px ${frame.previewColor}99`
    : '0 0 0 4px #7c3aed, 0 0 18px 4px rgba(124,58,237,0.5)'

  const titleHex = TITLE_HEX[title.id] ?? '#a78bfa'
  const fullName = `${(data.first_name || '').toUpperCase()} ${(data.last_name || '').toUpperCase()}`.trim()

  return (
    <div
      style={{
        width: 800,
        height: 450,
        boxSizing: 'border-box',
        padding: '20px 24px',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 24,
        background: 'radial-gradient(ellipse at top left, #1e0b4e 0%, #0f0a2e 50%, #050310 100%)',
        boxShadow: 'inset 0 0 60px rgba(124,58,237,0.35), 0 0 0 4px #fbbf24, 0 0 32px rgba(251,191,36,0.45)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      {/* Estrellitas decorativas como capa de fondo */}
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

      {/* ─── Header: logo izquierda, URL derecha ─── */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        height: 24,
      }}>
        <span style={{
          fontFamily: 'Bebas Neue, sans-serif',
          fontSize: 26, letterSpacing: 1.5,
          color: '#22d3ee',
          textShadow: '0 0 12px rgba(34,211,238,0.7)',
          lineHeight: 1,
        }}>
          #TREND
        </span>
        <span style={{ fontSize: 11, color: '#9ca3af' }}>
          trend-app-five.vercel.app
        </span>
      </div>

      {/* ─── Bloque principal: avatar a la izquierda, info a la derecha ─── */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', gap: 22, alignItems: 'flex-start',
      }}>
        {/* Avatar + badge NIV */}
        <div style={{ width: 150, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 140, height: 140, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
              boxShadow: frameBoxShadow,
              ...avatarBgStyle,
            }}
          >
            {avatar?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar.image} alt="avatar" crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : avatar ? (
              <span style={{ fontSize: 78, lineHeight: 1 }}>{avatar.emoji}</span>
            ) : (
              <span style={{ fontSize: 60, fontWeight: 'bold', color: '#fff' }}>
                {data.first_name?.[0]?.toUpperCase() ?? '?'}
              </span>
            )}
          </div>
          {/* Badge NIV debajo (en flujo, no superpuesto) */}
          <div
            style={{
              background: 'linear-gradient(to bottom, #fbbf24, #d97706)',
              color: '#1c1917',
              fontFamily: 'Bebas Neue, sans-serif', fontSize: 16, letterSpacing: 1,
              padding: '3px 14px', borderRadius: 999,
              boxShadow: '0 4px 10px rgba(251,191,36,0.45)',
              whiteSpace: 'nowrap',
              lineHeight: 1.2,
            }}
          >
            NIV. {data.level}
          </div>
        </div>

        {/* Info derecha — flex column con renglones bien separados */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Renglón 1: Nombre */}
          <p style={{
            margin: 0,
            fontFamily: 'Bebas Neue, sans-serif',
            fontSize: 34, lineHeight: 1.05,
            color: '#ffffff',
            textShadow: '0 2px 8px rgba(0,0,0,0.7)',
            overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
          }}>
            {fullName || '—'}
          </p>

          {/* Renglón 2: Username */}
          <p style={{
            margin: 0,
            color: '#67e8f9', fontSize: 14, lineHeight: 1.2,
            overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
          }}>
            @{data.username || 'jugador'}
          </p>

          {/* Renglón 3: Badges (título / iglesia / clan) — wrap permitido */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 6,
            marginTop: 4,
          }}>
            <Badge color={titleHex} bg="rgba(0,0,0,0.45)">⚔️ {title.label}</Badge>
            {churchName && (
              <Badge color="#fde68a" border="rgba(251,191,36,0.55)" bg="rgba(245,158,11,0.18)">
                {(churchEmoji ?? '⛪') + ' ' + churchName}
              </Badge>
            )}
            {clan && (
              <Badge color="#e9d5ff" border={clan.shield_color ?? '#a78bfa'} bg="rgba(124,58,237,0.2)">
                {(clan.shield_icon ?? '⚔️') + ' ' + clan.name}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* ─── Stats: 4 cards en una sola fila ─── */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', gap: 10,
      }}>
        <StatBox icon="🏆" label="Puntaje"   value={data.total_score}    accent="#fde047" />
        <StatBox icon="⚔️" label="Victorias" value={data.wins}            accent="#86efac" />
        <StatBox icon="📖" label="Capítulos" value={completedChapters}    accent="#fcd34d" />
        <StatBox icon="🔥" label="Racha"     value={data.streak_days}     accent="#fb923c" />
      </div>

      {/* ─── Bio + Versículo: bloque inferior con espacio garantizado ─── */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', gap: 10,
        flex: 1, minHeight: 0,
      }}>
        {data.bio && data.bio.trim() !== '' && (
          <div style={{
            flex: 1, minWidth: 0,
            background: 'rgba(124,58,237,0.15)',
            border: '1px solid rgba(167,139,250,0.4)',
            borderRadius: 10, padding: '8px 12px',
            display: 'flex', alignItems: 'center',
          }}>
            <p style={{
              margin: 0, color: '#e9d5ff', fontSize: 12, fontStyle: 'italic',
              fontFamily: 'Georgia, serif', lineHeight: 1.4,
              display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              &ldquo;{data.bio}&rdquo;
            </p>
          </div>
        )}
        {data.favorite_verse && data.favorite_verse.trim() !== '' && (
          <div style={{
            flex: 1.4, minWidth: 0,
            background: 'rgba(180,83,9,0.18)',
            border: '1px solid rgba(251,191,36,0.45)',
            borderRadius: 10, padding: '8px 12px',
          }}>
            <div style={{
              fontSize: 9, fontWeight: 700, letterSpacing: 1.2,
              textTransform: 'uppercase', color: '#fbbf24', marginBottom: 2,
            }}>
              📖 Versículo favorito
            </div>
            <p style={{
              margin: 0, color: '#fef3c7', fontSize: 12, fontStyle: 'italic',
              fontFamily: 'Georgia, serif', lineHeight: 1.4,
              display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              &ldquo;{data.favorite_verse}&rdquo;
            </p>
            {data.favorite_verse_ref && (
              <p style={{
                margin: '2px 0 0 0', textAlign: 'right',
                color: 'rgba(253,230,138,0.85)', fontSize: 10, fontWeight: 600,
              }}>
                — {data.favorite_verse_ref}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Badge({ children, color, border, bg }: {
  children: React.ReactNode; color: string; border?: string; bg: string
}) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '4px 10px', borderRadius: 999,
      border: `1.5px solid ${border ?? color}`,
      background: bg,
      color,
      fontSize: 12, fontWeight: 700,
      whiteSpace: 'nowrap',
      lineHeight: 1.2,
      maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis',
    }}>
      {children}
    </span>
  )
}

function StatBox({ icon, label, value, accent }: { icon: string; label: string; value: number | string; accent: string }) {
  return (
    <div style={{
      flex: 1,
      background: 'rgba(15,10,46,0.75)',
      border: '1px solid rgba(124,58,237,0.4)',
      borderRadius: 12, padding: '8px 6px',
      textAlign: 'center',
      minWidth: 0,
    }}>
      <div style={{ fontSize: 16, lineHeight: 1 }}>{icon}</div>
      <div style={{
        fontFamily: 'Bebas Neue, sans-serif',
        fontSize: 22, color: accent,
        lineHeight: 1, marginTop: 4,
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 9, color: '#9ca3af',
        textTransform: 'uppercase', letterSpacing: 1,
        marginTop: 3,
      }}>
        {label}
      </div>
    </div>
  )
}

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
