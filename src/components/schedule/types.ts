export type CalendarCategory = string;

export interface CalEvent {
  id: string;
  title: string;
  startTime: string; // ISO date string
  endTime: string;   // ISO date string
  color: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
  badge?: string;
  category: CalendarCategory;
  description: string;
  registered: boolean;
}

export interface Task {
  id: string;
  text: string;
  done: boolean;
}

export interface CalendarToggle {
  label: string;
  color: string;
}
