export const userBriefSelect = {
  id: true,
  email: true,
  name: true,
} as const;

export type UserBrief = {
  id: string;
  email: string;
  name: string | null;
};
