import { Season } from "../types";

export interface SeasonStatusProps {
  activeSeason?: Season;
  nextSeason?: Season;
  className?: string;
}

export interface SeasonCardProps {
  season: Season;
  isActive?: boolean;
  showActions?: boolean;
  onActivate?: (seasonId: string) => void;
  onEdit?: (season: Season) => void;
  onDelete?: (seasonId: string) => void;
  className?: string;
}

export interface SeasonFormData {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
}

export interface SeasonStats {
  totalParticipants: number;
  totalXpAwarded: number;
  totalEvents: number;
  averageXpPerParticipant: number;
  topPerformer?: {
    attendantId: string;
    attendantName: string;
    totalXp: number;
  };
}
