-- 006_drop_leader_strength: leaders no longer store breaking strength.

ALTER TABLE leaders DROP COLUMN strength_lb;
