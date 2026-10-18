import "server-only";
import { randomUUID } from "node:crypto";
import { query } from "./db";

export type PlatformEventType =
  | "profile_created"
  | "draft_saved"
  | "assistant_tested"
  | "publish_started"
  | "profile_published"
  | "template_saved"
  | "pdf_print_requested";

export async function recordPlatformEvent(
  userId: string,
  eventType: PlatformEventType,
  personaSlug: string,
  metadata: Record<string, string | number | boolean> = {},
) {
  await query(
    "INSERT INTO platform_events (id, user_id, persona_slug, event_type, metadata) VALUES ($1, $2, $3, $4, $5)",
    [randomUUID(), userId, personaSlug, eventType, JSON.stringify(metadata)],
  );
}

export async function recordPlatformEventSafely(
  userId: string,
  eventType: PlatformEventType,
  personaSlug: string,
  metadata: Record<string, string | number | boolean> = {},
) {
  try {
    await recordPlatformEvent(userId, eventType, personaSlug, metadata);
  } catch (error) {
    console.error(`[platform-analytics] Could not record ${eventType} for ${personaSlug}:`, error instanceof Error ? error.message : error);
  }
}

export type PlatformAnalytics = {
  ready: boolean;
  customers: number;
  profiles: number;
  publishedProfiles: number;
  activity: Record<PlatformEventType, number>;
  popularTemplates: { template: string; count: number }[];
};

const EVENT_TYPES: PlatformEventType[] = [
  "profile_created",
  "draft_saved",
  "assistant_tested",
  "publish_started",
  "profile_published",
  "template_saved",
  "pdf_print_requested",
];

export async function getPlatformAnalytics(): Promise<PlatformAnalytics> {
  const schema = await query<{ ready: boolean }>(
    `SELECT
       to_regclass('public.platform_events') IS NOT NULL
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'admin_users' AND column_name = 'role')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'personas' AND column_name = 'owner_user_id') AS ready`,
  );
  if (!schema.rows[0]?.ready) {
    return { ready: false, customers: 0, profiles: 0, publishedProfiles: 0, activity: Object.fromEntries(EVENT_TYPES.map((type) => [type, 0])) as Record<PlatformEventType, number>, popularTemplates: [] };
  }
  const [totals, events, templates] = await Promise.all([
    query<{ customers: number; profiles: number; published_profiles: number }>(
      `SELECT
         (SELECT count(*)::int FROM admin_users WHERE role = 'customer') AS customers,
         (SELECT count(*)::int FROM personas WHERE owner_user_id IS NOT NULL) AS profiles,
         (SELECT count(*)::int FROM personas WHERE owner_user_id IS NOT NULL AND published_version_id IS NOT NULL) AS published_profiles`,
    ),
    query<{ event_type: PlatformEventType; count: number }>(
      "SELECT event_type, count(*)::int AS count FROM platform_events GROUP BY event_type",
    ),
    query<{ template: string; count: number }>(
      `SELECT metadata->>'template' AS template, count(*)::int AS count
         FROM platform_events
        WHERE event_type = 'template_saved' AND metadata ? 'template'
        GROUP BY metadata->>'template'
        ORDER BY count(*) DESC
        LIMIT 5`,
    ),
  ]);
  const activity = Object.fromEntries(EVENT_TYPES.map((type) => [type, 0])) as Record<PlatformEventType, number>;
  for (const row of events.rows) activity[row.event_type] = row.count;
  return {
    ready: true,
    customers: totals.rows[0]?.customers ?? 0,
    profiles: totals.rows[0]?.profiles ?? 0,
    publishedProfiles: totals.rows[0]?.published_profiles ?? 0,
    activity,
    popularTemplates: templates.rows.filter((row) => row.template).map((row) => ({ template: row.template, count: row.count })),
  };
}
