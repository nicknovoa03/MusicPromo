type EventName =
  | "app_opened"
  | "sign_in_completed"
  | "guest_mode_started"
  | "onboarding_completed"
  | "create_started"
  | "photo_selected"
  | "audio_selected"
  | "preview_viewed"
  | "video_export_started"
  | "video_exported"
  | "video_export_failed"
  | "video_saved_to_camera_roll"
  | "share_tapped_instagram"
  | "share_tapped_tiktok"
  | "project_reopened"
  | "notification_received"
  | "notification_tapped";

export type { EventName };
