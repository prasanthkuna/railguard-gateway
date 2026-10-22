/**
 * submission = HackQuest / judges (no PreBroadcast / WorkOS frames)
 * full = include operator clips when recorded with auth (not for default submit)
 */
export type RailguardVideoMode = "submission" | "full"

export function railguardVideoMode(): RailguardVideoMode {
  return process.env.RAILGUARD_VIDEO_MODE === "full" ? "full" : "submission"
}
