export interface HeadacheRecord {
  id: string;
  userId: string;
  occurredAt: Date;
  intensity: number;
  character: string[];
  locations: string[];
  symptoms: string[];
  triggers: string[];
  durationMinutes?: number;
  medicationUsed: boolean;
  medicationName?: string;
  medicationAmount?: number;
  medicationTime?: Date;
  medicationEffect?: string;
  recoveryTime?: Date;
  recoveryLevel?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type HeadacheRecordInput = Omit<HeadacheRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;

export interface UserProfile {
  displayName?: string;
  medications?: string[];
}
