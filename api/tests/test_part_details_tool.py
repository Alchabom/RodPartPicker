from pathlib import Path

import pytest

from app.part_details import (
    PartDetailsError,
    build_sql,
    find_missing,
    next_migration_path,
    sql_str,
    write_migration,
)
from app.parts.models import FlyLine, Reel, Tippet

HEADER = "component,brand,model,purchase_url,image_file"


def write_csv(tmp_path: Path, *rows: str, header: str = HEADER) -> Path:
    path = tmp_path / "batch.csv"
    path.write_text("\n".join([header, *rows]) + "\n", encoding="utf-8")
    return path


@pytest.fixture
def parts_dir(tmp_path):
    root = tmp_path / "parts"
    (root / "reels").mkdir(parents=True)
    (root / "rods").mkdir()
    (root / "reels" / "a-b.webp").write_bytes(b"x")
    (root / "rods" / "a.webp").write_bytes(b"x")
    return root


def statements(sql: str) -> list[str]:
    return [
        line for line in sql.splitlines() if line.strip() and not line.startswith("--")
    ]


def run_sql(db, sql: str) -> None:
    conn = db.connection()
    for stmt in statements(sql):
        # PyMySQL %-formats the query even with no parameters, so a literal %
        # must be doubled here. The migration file keeps its single %, because
        # app/migrate.py runs it through cursor.execute() without parameters.
        conn.exec_driver_sql(stmt.replace("%", "%%"))


def test_build_writes_one_update_per_row(
    tmp_path, db, parts_dir, make_part, make_brand
):
    make_part(Reel, name="B", brand=make_brand("A"))
    make_part(Tippet, name="T", brand=make_brand("TB"))
    csv_path = write_csv(
        tmp_path,
        "reel,A,B,https://shop.example/ab,reels/a-b.webp",
        "tippet,TB,T,https://shop.example/t,",
    )
    sql = build_sql(csv_path, db, parts_dir)
    assert (
        "UPDATE reels SET purchase_url = 'https://shop.example/ab', "
        "image_path = 'reels/a-b.webp' WHERE brand_id = "
        "(SELECT id FROM brands WHERE name = 'A') AND name = 'B';"
    ) in sql
    assert (
        "UPDATE tippets SET purchase_url = 'https://shop.example/t' WHERE brand_id = "
        "(SELECT id FROM brands WHERE name = 'TB') AND name = 'T';"
    ) in sql
    tippet_stmt = next(s for s in statements(sql) if s.startswith("UPDATE tippets"))
    assert "image_path" not in tippet_stmt


def test_build_image_only_row(tmp_path, db, parts_dir, make_part, make_brand):
    make_part(Reel, name="B", brand=make_brand("A"))
    sql = build_sql(write_csv(tmp_path, "reel,A,B,,reels/a-b.webp"), db, parts_dir)
    assert "SET image_path = 'reels/a-b.webp' WHERE" in sql
    assert "purchase_url" not in sql.split("UPDATE", 1)[1]


def test_build_applies_to_every_size_row(
    tmp_path, db, parts_dir, make_part, make_brand
):
    brand = make_brand("A")
    r1 = make_part(Reel, name="B", brand=brand, min_line_weight=3, max_line_weight=5)
    r2 = make_part(Reel, name="B", brand=brand, min_line_weight=6, max_line_weight=8)
    sql = build_sql(
        write_csv(tmp_path, "reel,A,B,https://shop.example/ab,reels/a-b.webp"),
        db,
        parts_dir,
    )
    run_sql(db, sql)
    db.expire_all()
    for reel in (r1, r2):
        assert reel.purchase_url == "https://shop.example/ab"
        assert reel.image_path == "reels/a-b.webp"


@pytest.mark.parametrize(
    ("row", "expected"),
    [
        ("reel,A,B,http://x,", "https://"),
        ("reel,A,B,https://x,reels/X.webp", "image_file"),
        ("reel,A,B,https://x,rods/a.webp", "image_file"),
        ("reel,A,B,https://x,reels/missing.webp", "does not exist"),
        ("reel,A,Nope,https://x,", "not in the catalog"),
        ("spool,A,B,https://x,", "component"),
        ("tippet,TB,T,https://x,reels/a-b.webp", "only rods and reels"),
        ("reel,A,B,,", "nothing to set"),
    ],
)
def test_build_refusals(tmp_path, db, parts_dir, make_part, make_brand, row, expected):
    make_part(Reel, name="B", brand=make_brand("A"))
    make_part(Tippet, name="T", brand=make_brand("TB"))
    with pytest.raises(PartDetailsError) as exc:
        build_sql(write_csv(tmp_path, row), db, parts_dir)
    assert any(expected in e for e in exc.value.errors), exc.value.errors
    assert all(e.startswith("line 2:") for e in exc.value.errors)


def test_build_reports_every_bad_row(tmp_path, db, parts_dir, make_part, make_brand):
    make_part(Reel, name="B", brand=make_brand("A"))
    csv_path = write_csv(tmp_path, "reel,A,B,http://x,", "reel,A,Nope,https://x,")
    with pytest.raises(PartDetailsError) as exc:
        build_sql(csv_path, db, parts_dir)
    assert len(exc.value.errors) == 2
    assert exc.value.errors[0].startswith("line 2:")
    assert exc.value.errors[1].startswith("line 3:")


def test_build_refuses_bad_header(tmp_path, db, parts_dir):
    csv_path = write_csv(
        tmp_path, "reel,A,B,https://x", header="component,brand,model,url"
    )
    with pytest.raises(PartDetailsError) as exc:
        build_sql(csv_path, db, parts_dir)
    assert HEADER in exc.value.errors[0]


def test_sql_str_quotes():
    assert sql_str("O'Neil") == "'O''Neil'"
    assert sql_str("a\\") == "'a\\\\'"


def test_quote_round_trip(tmp_path, db, parts_dir, make_part, make_brand):
    reel = make_part(Reel, name="O'Neil", brand=make_brand("Back\\slash"))
    csv_path = write_csv(tmp_path, "reel,Back\\slash,O'Neil,https://shop.example/o,")
    run_sql(db, build_sql(csv_path, db, parts_dir))
    db.expire_all()
    assert reel.purchase_url == "https://shop.example/o"


def test_percent_in_url_executes(tmp_path, db, parts_dir, make_part, make_brand):
    reel = make_part(Reel, name="B", brand=make_brand("A"))
    url = "https://shop.example/a%20b?x=100%"
    run_sql(db, build_sql(write_csv(tmp_path, f"reel,A,B,{url},"), db, parts_dir))
    db.expire_all()
    assert reel.purchase_url == url


def test_build_accepts_excel_csv(tmp_path, db, parts_dir, make_part, make_brand):
    make_part(Reel, name="B", brand=make_brand("A"))
    path = tmp_path / "excel.csv"
    path.write_bytes(
        (HEADER + "\r\nreel,A,B,https://shop.example/ab,\r\n").encode("utf-8-sig")
    )
    assert "UPDATE reels" in build_sql(path, db, parts_dir)


def test_build_trims_cells(tmp_path, db, parts_dir, make_part, make_brand):
    make_part(Reel, name="Liquid S", brand=make_brand("Trim Co"))
    csv_path = write_csv(
        tmp_path, 'reel," Trim Co "," Liquid S "," https://a.example/x ",'
    )
    sql = build_sql(csv_path, db, parts_dir)
    assert "purchase_url = 'https://a.example/x'" in sql
    assert "name = 'Trim Co'" in sql
    assert "name = 'Liquid S';" in sql


def test_build_refuses_duplicate_rows(tmp_path, db, parts_dir, make_part, make_brand):
    brand = make_brand("A")
    make_part(Reel, name="B", brand=brand)
    make_part(Reel, name="C", brand=brand)
    csv_path = write_csv(
        tmp_path,
        "reel,A,B,https://x,",
        "reel,A,C,https://x,",
        "reel,a,b,https://y,",
    )
    with pytest.raises(PartDetailsError) as exc:
        build_sql(csv_path, db, parts_dir)
    assert any("line 4" in e and "line 2" in e for e in exc.value.errors)


def test_build_refuses_long_url(tmp_path, db, parts_dir, make_part, make_brand):
    make_part(Reel, name="B", brand=make_brand("A"))
    url = "https://" + "a" * 493
    assert len(url) == 501
    with pytest.raises(PartDetailsError) as exc:
        build_sql(write_csv(tmp_path, f"reel,A,B,{url},"), db, parts_dir)
    assert any("500" in e for e in exc.value.errors)


def test_build_matches_case_insensitively(
    tmp_path, db, parts_dir, make_part, make_brand
):
    make_part(Reel, name="Liquid S", brand=make_brand("Trim Co"))
    sql = build_sql(
        write_csv(tmp_path, "reel,trim co,liquid s,https://x,"), db, parts_dir
    )
    assert "UPDATE reels" in sql


def test_build_refuses_wrong_case_image_file(
    tmp_path, db, parts_dir, make_part, make_brand
):
    make_part(Reel, name="B", brand=make_brand("A"))
    (parts_dir / "reels" / "Lamson-Liquid-S.webp").write_bytes(b"x")
    csv_path = write_csv(tmp_path, "reel,A,B,,reels/lamson-liquid-s.webp")
    with pytest.raises(PartDetailsError) as exc:
        build_sql(csv_path, db, parts_dir)
    assert any(
        "does not exist" in e and "found Lamson-Liquid-S.webp" in e
        for e in exc.value.errors
    ), exc.value.errors


def test_find_missing_lists_rod_series_with_link_but_no_image(
    db, make_brand, make_rod_series
):
    brand = make_brand("Zed Rods")
    make_rod_series(brand=brand, name="LinkOnly", purchase_url="https://x")
    make_rod_series(
        brand=brand, name="Full", purchase_url="https://x", image_path="rods/f.webp"
    )

    rods = find_missing(db)["rod"]

    assert "Zed Rods LinkOnly" in rods
    assert "Zed Rods Full" not in rods


def test_find_missing(db, make_part, make_brand):
    brand = make_brand("Zed Missing")
    make_part(
        Reel,
        name="Full",
        brand=brand,
        purchase_url="https://x",
        image_path="reels/f.webp",
    )
    make_part(Reel, name="LinkOnly", brand=brand, purchase_url="https://x")
    make_part(Tippet, name="Bare", brand=brand)
    make_part(FlyLine, name="Linked", brand=brand, purchase_url="https://x")
    missing = find_missing(db)
    assert "Zed Missing LinkOnly" in missing["reel"]
    assert "Zed Missing Full" not in missing["reel"]
    assert "Zed Missing Bare" in missing["tippet"]
    assert "Zed Missing Linked" not in missing["line"]
    assert missing["reel"] == sorted(missing["reel"])


def test_next_migration_name(tmp_path):
    (tmp_path / "020_x.sql").write_text("")
    (tmp_path / "021_y.sql").write_text("")
    assert next_migration_path(tmp_path, "batch1").name == "022_part_details_batch1.sql"
    with pytest.raises(ValueError):
        next_migration_path(tmp_path, "Bad Label")


def test_build_refuses_control_chars_in_file_name(tmp_path, db, parts_dir):
    path = tmp_path / "a\nb.csv"
    path.write_text(HEADER + "\n", encoding="utf-8")
    with pytest.raises(PartDetailsError) as exc:
        build_sql(path, db, parts_dir)
    assert "file name" in exc.value.errors[0]


def test_build_refuses_header_only_csv(tmp_path, db, parts_dir):
    with pytest.raises(PartDetailsError) as exc:
        build_sql(write_csv(tmp_path), db, parts_dir)
    assert "no rows" in exc.value.errors[0]


def test_write_migration_refuses_existing(tmp_path):
    path = tmp_path / "022_x.sql"
    write_migration(path, "A")
    with pytest.raises(PartDetailsError) as exc:
        write_migration(path, "B")
    assert "already exists" in exc.value.errors[0]
    assert path.read_text() == "A"


def test_trailing_backslash_round_trip(tmp_path, db, parts_dir, make_part, make_brand):
    reel = make_part(Reel, name="Model\\", brand=make_brand("Slash Co"))
    csv_path = write_csv(tmp_path, "reel,Slash Co,Model\\,https://shop.example/m,")
    run_sql(db, build_sql(csv_path, db, parts_dir))
    db.expire_all()
    assert reel.purchase_url == "https://shop.example/m"
    assert reel.name == "Model\\"


def test_build_updates_rod_series_by_series_name(
    tmp_path, db, parts_dir, make_brand, make_rod_series, make_part
):
    brand = make_brand("Seriesco")
    make_rod_series(brand=brand, name="Big Stick")
    csv_path = write_csv(
        tmp_path, "rod,Seriesco,Big Stick,https://shop.example/bs,rods/a.webp"
    )

    sql = build_sql(csv_path, db, parts_dir)

    assert (
        "UPDATE rod_series SET purchase_url = 'https://shop.example/bs', "
        "image_path = 'rods/a.webp' WHERE brand_id = "
        "(SELECT id FROM brands WHERE name = 'Seriesco') AND name = 'Big Stick';"
    ) in sql


def test_build_refuses_rod_size_names(
    tmp_path, db, parts_dir, make_brand, make_rod_series, make_part
):
    from app.parts.models import Rod

    brand = make_brand("Sizeco")
    series = make_rod_series(brand=brand, name="Big Stick")
    make_part(Rod, name="Big Stick 590-4", series=series)
    csv_path = write_csv(tmp_path, "rod,Sizeco,Big Stick 590-4,https://shop.example/x,")

    with pytest.raises(PartDetailsError) as exc:
        build_sql(csv_path, db, parts_dir)

    assert "Big Stick 590-4 is not in the catalog for rod" in exc.value.errors[0]
