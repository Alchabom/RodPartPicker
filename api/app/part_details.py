"""Turns a CSV of purchase links and images into a numbered seed migration.

    uv run python -m app.part_details build <csv> --name <label> [--out PATH]
    uv run python -m app.part_details missing

Design: docs/superpowers/specs/2026-11-18-part-details-design.md
"""

import argparse
import csv
import re
import sys
from datetime import date
from pathlib import Path

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.config import settings
from app.db import make_engine
from app.migrate import MIGRATIONS_DIR
from app.parts.links import PATH_RULE
from app.parts.models import Brand, FlyLine, Leader, Reel, RodSeries, Tippet

HEADER = ["component", "brand", "model", "purchase_url", "image_file"]
# Rod links and images live on the series, so rod rows name a series
MODELS = {
    "rod": RodSeries,
    "reel": Reel,
    "line": FlyLine,
    "leader": Leader,
    "tippet": Tippet,
}
IMAGE_COMPONENTS = ("rod", "reel")
MAX_URL_LENGTH = 500  # the purchase_url column is VARCHAR(500)
LABEL_RULE = re.compile(r"^[a-z0-9_]+$")
PARTS_DIR = Path(__file__).resolve().parents[2] / "public" / "parts"


class PartDetailsError(Exception):
    def __init__(self, errors: list[str]):
        super().__init__("\n".join(errors))
        self.errors = errors


def sql_str(value: str) -> str:
    """A single-quoted MySQL literal. MySQL's default sql_mode treats \\ as an
    escape character, so backslashes are doubled before the quotes are."""
    return "'" + value.replace("\\", "\\\\").replace("'", "''") + "'"


def _model_exists(db: Session, model, brand: str, name: str) -> bool:
    # Bound parameters, so the match uses the database's own collation
    count = db.execute(
        select(func.count())
        .select_from(model)
        .join(Brand, model.brand_id == Brand.id)
        .where(Brand.name == brand, model.name == name)
    ).scalar_one()
    return count > 0


def _check_row(db: Session, row: dict[str, str], parts_dir: Path) -> list[str]:
    """Every problem with one row, as messages without the line prefix."""
    component, brand, model = row["component"], row["brand"], row["model"]
    url, image = row["purchase_url"], row["image_file"]
    errors: list[str] = []

    if component not in MODELS:
        return [f"component {component!r} must be one of {', '.join(MODELS)}"]
    for field in ("brand", "model", "purchase_url", "image_file"):
        if any(ord(ch) < 32 for ch in row[field]):
            errors.append(f"{field} contains a control character")
    if errors:
        return errors

    if url and not url.startswith("https://"):
        errors.append(f"purchase_url must start with https:// (got {url!r})")
    elif len(url) > MAX_URL_LENGTH:
        errors.append(f"purchase_url is {len(url)} characters; the limit is 500")

    if image:
        if component not in IMAGE_COMPONENTS:
            errors.append(
                "image_file is not allowed here: only rods and reels have images"
            )
        elif not PATH_RULE.fullmatch(image) or not image.startswith(f"{component}s/"):
            errors.append(
                f"image_file {image!r} must be {component}s/<lowercase-name>.webp"
            )
        else:
            # Compare against the real listing: APFS is case-insensitive but
            # Vercel's Linux is not, so is_file() would pass a wrongly cased file.
            folder, _, name = image.partition("/")
            try:
                names = {p.name for p in (parts_dir / folder).iterdir()}
            except OSError:
                names = set()
            if name not in names:
                found = next((n for n in sorted(names) if n.lower() == name), None)
                hint = f" (found {found}; rename it to lowercase)" if found else ""
                errors.append(
                    f"image file {image} does not exist under {parts_dir}{hint}"
                )

    if not url and not image:
        errors.append("nothing to set: purchase_url and image_file are both empty")

    if not brand or not model or not _model_exists(db, MODELS[component], brand, model):
        errors.append(f"{brand} {model} is not in the catalog for {component}")
    return errors


def _update_sql(row: dict[str, str]) -> str:
    table = MODELS[row["component"]].__tablename__
    sets = []
    if row["purchase_url"]:
        sets.append(f"purchase_url = {sql_str(row['purchase_url'])}")
    if row["image_file"]:
        sets.append(f"image_path = {sql_str(row['image_file'])}")
    return (
        f"UPDATE {table} SET {', '.join(sets)} WHERE brand_id = "
        f"(SELECT id FROM brands WHERE name = {sql_str(row['brand'])}) "
        f"AND name = {sql_str(row['model'])};"
    )


def build_sql(csv_path: Path, db: Session, parts_dir: Path) -> str:
    """The migration text for a CSV, or PartDetailsError listing every bad row."""
    if any(ord(ch) < 32 for ch in csv_path.name):
        raise PartDetailsError(["file name: control characters are not allowed"])
    # utf-8-sig drops the BOM Excel adds; newline="" lets csv handle CRLF
    with open(csv_path, encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        header = [h.strip() for h in reader.fieldnames or []]
        if header != HEADER:
            raise PartDetailsError(
                [f"line 1: the header must be exactly {','.join(HEADER)}"]
            )
        reader.fieldnames = header

        errors: list[str] = []
        statements: list[str] = []
        seen: dict[tuple[str, str, str], int] = {}
        for raw in reader:
            line = reader.line_num
            if None in raw:
                errors.append(f"line {line}: too many columns")
                continue
            row = {k: (v or "").strip() for k, v in raw.items()}
            if not any(row.values()):
                continue  # Excel leaves rows of bare commas at the end
            row_errors = _check_row(db, row, parts_dir)
            key = (row["component"].lower(), row["brand"].lower(), row["model"].lower())
            if key in seen:
                row_errors.append(
                    f"duplicates line {seen[key]} (same component, brand and model)"
                )
            else:
                seen[key] = line
            errors.extend(f"line {line}: {e}" for e in row_errors)
            if not row_errors:
                statements.append(_update_sql(row))

    if errors:
        raise PartDetailsError(errors)
    if not statements:
        raise PartDetailsError(["line 1: the CSV has no rows"])
    header_comment = (
        f"-- Part details from {csv_path.name}, generated {date.today().isoformat()}.\n"
        "-- Design: docs/superpowers/specs/2026-11-18-part-details-design.md\n"
    )
    return header_comment + "\n" + "\n".join(statements) + "\n"


def find_missing(db: Session) -> dict[str, list[str]]:
    """Models still lacking a link (and, for rods and reels, an image)."""
    result: dict[str, list[str]] = {}
    for component, model in MODELS.items():
        lacking = model.purchase_url.is_(None)
        if component in IMAGE_COMPONENTS:
            lacking = or_(lacking, model.image_path.is_(None))
        rows = db.execute(
            select(Brand.name, model.name)
            .join(Brand, model.brand_id == Brand.id)
            .where(lacking)
            .distinct()
        ).all()
        result[component] = sorted(f"{brand} {name}" for brand, name in rows)
    return result


def next_migration_path(migrations_dir: Path, label: str) -> Path:
    if not LABEL_RULE.fullmatch(label):
        raise ValueError("--name may only contain lowercase letters, digits and _")
    numbers = [
        int(p.name[:3]) for p in migrations_dir.glob("*.sql") if p.name[:3].isdigit()
    ]
    return (
        migrations_dir / f"{max(numbers, default=0) + 1:03d}_part_details_{label}.sql"
    )


def write_migration(path: Path, sql: str) -> None:
    """Write the migration, refusing to overwrite anything (applied files included)."""
    if path.exists():
        raise PartDetailsError([f"{path} already exists; refusing to overwrite it"])
    path.write_text(sql, encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="part_details")
    sub = parser.add_subparsers(dest="command", required=True)
    build = sub.add_parser("build", help="turn a CSV into a seed migration")
    build.add_argument("csv", type=Path)
    build.add_argument("--name", required=True, help="label for the migration file")
    build.add_argument("--out", type=Path, help="write here instead of api/migrations")
    sub.add_parser("missing", help="list models with no link or image")
    args = parser.parse_args(argv)

    engine = make_engine(settings.DB_NAME)
    try:
        with Session(engine) as db:
            if args.command == "missing":
                for component, names in find_missing(db).items():
                    print(f"{component} ({len(names)})")
                    for name in names:
                        print(f"  {name}")
                return 0
            try:
                default_out = next_migration_path(MIGRATIONS_DIR, args.name)
                out = args.out or default_out
            except ValueError as e:
                print(e, file=sys.stderr)
                return 1
            try:
                sql = build_sql(args.csv, db, PARTS_DIR)
                write_migration(out, sql)
            except PartDetailsError as e:
                print("\n".join(e.errors), file=sys.stderr)
                return 1
            print(f"Wrote {out}")
            return 0
    finally:
        engine.dispose()


if __name__ == "__main__":
    sys.exit(main())
