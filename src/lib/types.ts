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
  duel_wins: number
  duel_losses: number
  duel_draws: number
  duel_win_streak: number
  duel_best_streak: number
  title: string | null
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
