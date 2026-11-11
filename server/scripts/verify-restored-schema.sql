SELECT count(*) = 7
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'applications', 'resources', 'seeds', 'events', 'game_leaderboard',
    'resource_video_links', 'seed_video_links'
  );
