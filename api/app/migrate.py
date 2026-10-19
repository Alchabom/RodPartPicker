"""Applies api/migrations/*.sql in filename order, once each.

Applied files are recorded in the schema_migrations table.

MySQL commits DDL (CREATE/ALTER) implicitly, so a migration that fails halfway
cannot be rolled back automatically: fix the file, drop what it created, rerun.
"""

from pathlib import Path

import pymysql
from pymysql.constants import CLIENT

from app.config import settings

MIGRATIONS_DIR = Path(__file__).resolve().parents[1] / "migrations"


def migrate(db_name: str) -> None:
    conn = pymysql.connect(
        host=settings.DB_HOST,
        port=settings.DB_PORT,
        user=settings.DB_USER,
        password=settings.DB_PASSWORD,
        client_flag=CLIENT.MULTI_STATEMENTS,  # migration files hold many statements
    )
    try:
        with conn.cursor() as cur:
            # An identifier, not a value, so it can't be a %s placeholder.
            # Safe because db_name comes from our settings, never from a request.
            cur.execute(
                f"CREATE DATABASE IF NOT EXISTS `{db_name}` "
                "CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci"
            )
            conn.select_db(db_name)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS schema_migrations (
                  filename    VARCHAR(255) PRIMARY KEY,
                  applied_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB""")

            cur.execute("SELECT filename FROM schema_migrations")
            applied = {row[0] for row in cur.fetchall()}

            count = 0
            for path in sorted(MIGRATIONS_DIR.glob("*.sql")):
                if path.name in applied:
                    continue
                print(f"Applying {path.name}")
                cur.execute(path.read_text())
                # Read every statement's result, or the next execute fails with
                # "Commands out of sync". Errors in later statements surface here.
                while cur.nextset():
                    pass
                cur.execute(
                    "INSERT INTO schema_migrations (filename) VALUES (%s)", (path.name,)
                )
                conn.commit()
                count += 1

        print(
            "Database is up to date."
            if count == 0
            else f"Applied {count} migration(s)."
        )
    finally:
        conn.close()


if __name__ == "__main__":
    migrate(settings.DB_NAME)
