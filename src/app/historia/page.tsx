export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Stars from '@/components/Stars'
import Logo from '@/components/Logo'
import { ChevronLeft, CheckCircle2, Lock, Sparkles, Scroll } from 'lucide-react'

type ChapterRow = {
  id: string
  book: string
  chapter: number
  title: string
  character_name: string
  character_emoji: string
  week_start: string
  week_end: string
}

type TimelineItem = ChapterRow & {
  state: 'completed' | 'current' | 'available' | 'locked'
  total: number
  correct: number
}

export default async function HistoriaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
  })

  const { data: chapters } = await supabase
    .from('story_chapters')
    .select('id, book, chapter, title, character_name, character_emoji, week_start, week_end')
    .order('week_start', { ascending: true })

  const chapterList = (chapters ?? []) as ChapterRow[]
  const chapterIds = chapterList.map(c => c.id)

  const [
    { data: myAnswers },
    { data: storyQs },
  ] = chapterIds.length > 0
    ? await Promise.all([
        supabase
          .from('story_answers')
          .select('chapter_id, is_correct')
          .eq('user_id', user.id)
          .in('chapter_id', chapterIds),
        supabase
          .from('questions')
          .select('id, story_chapter_id')
          .in('story_chapter_id', chapterIds),
      ])
    : [{ data: [] }, { data: [] }]

  const totalByChapter = new Map<string, number>()
  for (const q of (storyQs ?? []) as { id: string; story_chapter_id: string }[]) {
    const id = q.story_chapter_id
    totalByChapter.set(id, (totalByChapter.get(id) ?? 0) + 1)
  }

  const answeredByChapter = new Map<string, { total: number; correct: number }>()
  for (const a of (myAnswers ?? []) as { chapter_id: string; is_correct: boolean }[]) {
    const s = answeredByChapter.get(a.chapter_id) ?? { total: 0, correct: 0 }
    s.total++
    if (a.is_correct) s.correct++
    answeredByChapter.set(a.chapter_id, s)
  }

  const items: TimelineItem[] = chapterList.map(c => {
    const total = totalByChapter.get(c.id) ?? 0
    const answered = answeredByChapter.get(c.id)?.total ?? 0
    const correct = answeredByChapter.get(c.id)?.correct ?? 0
    const isCompleted = total > 0 && answered >= total
    const isCurrent = c.week_start <= today && today <= c.week_end
    const isUnlocked = c.week_start <= today
    let state: TimelineItem['state']
    if (isCompleted) state = 'completed'
    else if (isCurrent) state = 'current'
    else if (isUnlocked) state = 'available'
    else state = 'locked'
    return { ...c, state, total, correct }
  })

  return (
    <div
      className="min-h-screen relative"
      style={{
        background:
          'radial-gradient(ellipse at top, #2d1b08 0%, #1a0f06 45%, #0a0604 100%)',
      }}
    >
      <Stars count={60} />

      <div className="relative z-10">
        <header className="px-4 pt-7 pb-4 flex items-center justify-between max-w-lg mx-auto">
          <Link href="/" className="flex items-center gap-1 text-yellow-200/70 hover:text-yellow-100 text-sm transition-colors">
            <ChevronLeft size={18} /> Volver
          </Link>
          <Logo size="sm" />
        </header>

        <div className="px-4 max-w-lg mx-auto pb-8">
          <div className="text-center mb-6">
            <p className="text-yellow-300/80 text-xs uppercase tracking-[0.3em] font-semibold">
              ✦ Modo Historia ✦
            </p>
            <h1 className="font-bebas text-4xl text-yellow-100 leading-none mt-1.5">VIAJE BÍBLICO</h1>
            <p className="text-yellow-200/70 text-sm italic mt-1">Un capítulo nuevo cada semana</p>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-10">
              <Scroll size={40} className="text-yellow-500/50 mx-auto mb-3" />
              <p className="text-yellow-200/70 text-sm">Pronto habrá capítulos disponibles.</p>
            </div>
          ) : (
            <div className="relative space-y-3">
              <div className="absolute left-[15px] top-3 bottom-3 w-0.5 bg-gradient-to-b from-yellow-600/50 via-yellow-700/25 to-transparent pointer-events-none" />
              {items.map(item => (
                <ChapterTimelineItem key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ChapterTimelineItem({ item }: { item: TimelineItem }) {
  const styles = {
    completed: {
      card: 'border-emerald-600/50 bg-gradient-to-br from-emerald-900/25 to-emerald-950/40 hover:border-emerald-400/70',
      dot: 'bg-emerald-500 border-emerald-300',
      emoji: '',
    },
    current: {
      card: 'border-yellow-500/70 bg-gradient-to-br from-yellow-900/35 to-amber-950/50 hover:border-yellow-300 ring-2 ring-yellow-500/30',
      dot: 'bg-yellow-400 border-yellow-200 ring-4 ring-yellow-500/40',
      emoji: '',
    },
    available: {
      card: 'border-amber-700/40 bg-gradient-to-br from-amber-950/40 to-stone-950/60 hover:border-amber-500/70',
      dot: 'bg-amber-600 border-amber-400',
      emoji: '',
    },
    locked: {
      card: 'border-stone-700/30 bg-stone-950/40 cursor-not-allowed',
      dot: 'bg-stone-700 border-stone-500',
      emoji: 'opacity-40 grayscale',
    },
  }[item.state]

  const inner = (
    <div className={`relative flex items-center gap-3 rounded-2xl border p-3 transition-all ${styles.card}`}>
      <div className={`absolute -left-[28px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 z-10 ${styles.dot}`} />
      <div className={`w-12 h-12 flex-shrink-0 rounded-xl bg-black/30 border border-yellow-700/30 flex items-center justify-center text-2xl ${styles.emoji}`}>
        {item.character_emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[10px] text-yellow-400/80 font-bold uppercase tracking-widest">
            Cap. {item.chapter}
          </span>
          {item.state === 'current' && (
            <span className="text-[9px] bg-yellow-500/20 border border-yellow-500/50 text-yellow-300 px-1.5 rounded-full font-bold uppercase tracking-wider">
              Actual
            </span>
          )}
        </div>
        <p className="font-bebas text-white text-lg leading-none truncate">{item.book} {item.chapter}</p>
        <p className="text-yellow-200/70 text-xs italic truncate">{item.title}</p>
        <p className="text-yellow-300/50 text-[10px] mt-0.5">{item.character_name}</p>
      </div>
      <div className="flex-shrink-0">
        {item.state === 'completed' && (
          <div className="flex flex-col items-end gap-1">
            <span className="inline-flex items-center gap-1 bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full font-bold">
              <CheckCircle2 size={10} /> Completo
            </span>
            <span className="text-emerald-200/80 text-[10px]">{item.correct}/{item.total}</span>
          </div>
        )}
        {item.state === 'current' && (
          <span className="inline-flex items-center gap-1 bg-yellow-500/30 border border-yellow-400/60 text-yellow-100 text-[10px] px-2 py-1 rounded-full font-bold">
            <Sparkles size={10} /> Jugar
          </span>
        )}
        {item.state === 'available' && (
          <span className="inline-flex items-center gap-1 bg-amber-600/20 border border-amber-500/40 text-amber-200 text-[10px] px-2 py-1 rounded-full font-bold">
            Disponible
          </span>
        )}
        {item.state === 'locked' && (
          <span className="inline-flex items-center gap-1 bg-stone-700/40 border border-stone-600/40 text-stone-400 text-[10px] px-2 py-1 rounded-full font-bold">
            <Lock size={10} /> {formatWeekStart(item.week_start)}
          </span>
        )}
      </div>
    </div>
  )

  if (item.state === 'locked') {
    return <div className="relative pl-8">{inner}</div>
  }
  return (
    <Link href={`/historia/capitulo/${item.id}`} className="block relative pl-8">
      {inner}
    </Link>
  )
}

function formatWeekStart(ws: string): string {
  const d = new Date(ws + 'T00:00:00')
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
}
