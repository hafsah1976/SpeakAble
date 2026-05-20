from __future__ import annotations

import os
import sys
from pathlib import Path

import psycopg


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python database/scripts/apply_sql.py <sql-file>", file=sys.stderr)
        return 2

    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL is required.", file=sys.stderr)
        return 2

    sql_path = Path(sys.argv[1])
    if not sql_path.exists():
        print(f"SQL file not found: {sql_path}", file=sys.stderr)
        return 2

    with psycopg.connect(database_url) as connection:
        connection.execute(sql_path.read_text(encoding="utf-8"))

    print(f"Applied {sql_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
