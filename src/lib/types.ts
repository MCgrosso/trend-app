export interface Profile {
  id: string
  username: string
  first_name: string
  last_name: string
  avatar_url: string | null
  total_score: number
  streak_days: number
  role: 'user' | 'admin'
  created_at: string
  last_played_at: string | null
  frame: string | null
  wins: number
  losses: number
  draws: number
  win_streak: number
  best_streak: number
  title: string | null
  bio: string | null
  avatar_bg: string | null
  church_id: string | null
  clan_id: string | null
  inter_church_wins: number
}

export interface Church {
  id: string
  name: string
  abbreviation: string | null
  icon_emoji: string | null
  icon_url: string | null
  description: string | null
  status: 'pending' | 'approved' | 'rejected'
  requested_by: string | null
  created_at: string
}

export interface Clan {
  id: string
  name: string
  church_id: string | null
  shield_color: string | null
  shield_bg: string | null
  shield_icon: string | null
  created_by: string | null
  is_predefined: boolean
  created_at: string
}

export interface ChurchRankingRow {
  id: string
  name: string
  abbreviation: string | null
  icon_emoji: string | null
  member_count: number
  total_score: number
}

export interface ChurchAmbassadorRow {
  church_id: string
  user_id: string
  username: string
  first_name: string
  inter_church_wins: number
}

export interface Duel {
  id: string
  challenger_id: string
  opponent_id: string
  status: 'pending' | 'active' | 'finished' | 'cancelled' | 'rejected'
  categories: string[]
  challenger_score: number
  opponent_score: number
  winner_id: string | null
  challenger_finished: boolean
  opponent_finished: boolean
  created_at: string
  finished_at: string | null
  is_inter_church?: boolean
  result_applied?: boolean
}

export interface DuelQuestion {
  id: string
  duel_id: string
  question_id: string
  question_order: number
  challenger_answer: string | null
  challenger_correct: boolean | null
  opponent_answer: string | null
  opponent_correct: boolean | null
}

export interface Question {
  id: string
  question: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_option: 'A' | 'B' | 'C' | 'D'
  explanation: string
  image_url: string | null
  available_date: string
  created_at: string
}

export interface Answer {
  id: string
  user_id: string
  question_id: string
  selected_option: 'A' | 'B' | 'C' | 'D'
  is_correct: boolean
  answered_at: string
}

export interface Announcement {
  id: string
  title: string
  description: string
  date: string
  created_at: string
}

export interface WeeklyProfile {
  id: string
  username: string
  first_name: string
  last_name: string
  avatar_url: string | null
  frame: string | null
  avatar_bg: string | null
  weekly_score: number
}

export interface Event {
  id: string
  title: string
  description: string
  event_date: string
  location: string
  created_at: string
}
