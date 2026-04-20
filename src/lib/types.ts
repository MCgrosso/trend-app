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
