"""
convert_legacy_narratives.py
-----------------------------
Converts a legacy semester narrative JSON file into the canonical archive
format used by this repository.

Expected input format:
    {
        "version": 1,
        "saved": "2026-03-23T18:18:27.300Z",
        "narratives": {
            "COURSECODE__First_Last": "Narrative text here"
        }
    }

Expected output format:
    {
        "version": 1,
        "school_year": "2025-2026",
        "term": "Spring",
        "source_file": "narratives_spring2026_save-34.json",
        "saved_at": "2026-03-23T18:18:27.300Z",
        "records": [
            {
                "student_id": "First_Last",
                "student_name": "First Last",
                "grade_level": 6,
                "school_year": "2025-2026",
                "term": "Spring",
                "course_code": "COURSECODE",
                "course_name": "6th Grade Technology",
                "narrative_text": "Narrative text here",
                "tags": [],
                "meta": {},
                "source_file": "narratives_spring2026_save-34.json",
                "saved_at": "2026-03-23T18:18:27.300Z"
            }
        ]
    }

Sample command:
    python scripts/convert_legacy_narratives.py \\
      --input data/raw/narratives_spring2026_save-34.json \\
      --output data/terms/narratives_2025-2026_spring.json \\
      --school-year 2025-2026 \\
      --term Spring
"""

import argparse
import json
import os
import re
import sys

# ---------------------------------------------------------------------------
# Default course map
# ---------------------------------------------------------------------------

DEFAULT_COURSE_MAP = {
    "F": {"grade_level": 6, "course_name": "6th Grade Technology"},
    "G": {"grade_level": 7, "course_name": "7th Grade Technology"},
    "A": {"grade_level": 8, "course_name": "8th Grade Technology"},
    "C": {"grade_level": 8, "course_name": "Communications"},
}

VALID_TERMS = {"Fall", "Spring"}


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------


def load_json(path):
    """Load and parse a JSON file, raising clear errors on failure.

    Args:
        path (str): Filesystem path to the JSON file.

    Returns:
        dict | list: Parsed JSON data.

    Raises:
        SystemExit: If the file does not exist or contains invalid JSON.
    """
    if not os.path.isfile(path):
        sys.exit(f"Error: Input file not found: {path}")
    try:
        with open(path, "r", encoding="utf-8") as fh:
            return json.load(fh)
    except json.JSONDecodeError as exc:
        sys.exit(f"Error: Could not parse JSON from '{path}': {exc}")


def load_course_map(path=None):
    """Return the course map, loading from a file if a path is given.

    The course map must be a JSON object whose keys are course codes and
    whose values are objects with ``grade_level`` (int) and
    ``course_name`` (str).

    Args:
        path (str | None): Path to a custom course-map JSON file.  When
            ``None`` the built-in :data:`DEFAULT_COURSE_MAP` is used.

    Returns:
        dict: Mapping of course code -> {grade_level, course_name}.

    Raises:
        SystemExit: If the file is missing or malformed.
    """
    if path is None:
        return DEFAULT_COURSE_MAP
    data = load_json(path)
    if not isinstance(data, dict):
        sys.exit(f"Error: Course map file must contain a JSON object: {path}")
    return data


def parse_legacy_key(key):
    """Split a legacy narrative key into (course_code, student_id).

    The expected format is ``COURSECODE__First_Last``.  The split is
    performed on the *first* occurrence of ``__``.

    Args:
        key (str): A key from the legacy ``narratives`` object.

    Returns:
        tuple[str, str] | None: ``(course_code, student_id)`` on success,
            or ``None`` when the key does not contain ``__``.
    """
    if "__" not in key:
        return None
    course_code, student_id = key.split("__", 1)
    return course_code, student_id


def student_name_from_id(student_id):
    """Convert a student ID like ``First_Last`` to a display name.

    Underscores are replaced with spaces.

    Args:
        student_id (str): Student identifier using underscores as word
            separators.

    Returns:
        str: Human-readable name (e.g. ``"First Last"``).
    """
    return student_id.replace("_", " ")


def normalize_narrative_text(text):
    """Clean narrative text for storage.

    - Strips leading and trailing whitespace.
    - Collapses three or more consecutive trailing newlines into two.

    The original meaning and internal formatting are preserved.

    Args:
        text (str): Raw narrative string from the legacy file.

    Returns:
        str: Cleaned narrative string.
    """
    text = text.strip()
    # Collapse runs of 3+ newlines at the end of the string to exactly two.
    text = re.sub(r"\n{3,}$", "\n\n", text)
    return text


def convert_records(data, school_year, term, source_file, course_map):
    """Convert the legacy ``narratives`` object into a list of record dicts.

    Args:
        data (dict): Parsed legacy JSON document.
        school_year (str): e.g. ``"2025-2026"``.
        term (str): ``"Fall"`` or ``"Spring"``.
        source_file (str): Base name of the input file (used in each record).
        course_map (dict): Mapping of course code -> {grade_level, course_name}.

    Returns:
        tuple[list[dict], list[str]]: A tuple of ``(records, warnings)``
            where *records* are sorted by course_code then student_name and
            *warnings* are human-readable strings describing any issues found.
    """
    narratives = data.get("narratives", {})
    saved_at = data.get("saved", "")
    records = []
    warnings = []

    for key, raw_text in narratives.items():
        parsed = parse_legacy_key(key)
        if parsed is None:
            warnings.append(
                f"Skipping malformed key (no '__' separator): '{key}'"
            )
            continue

        course_code, student_id = parsed
        student_name = student_name_from_id(student_id)
        narrative_text = normalize_narrative_text(raw_text)

        course_info = course_map.get(course_code)
        if course_info is None:
            warnings.append(
                f"Unknown course code '{course_code}' for key '{key}'. "
                "Setting grade_level=null and course_name='Unknown Course'."
            )
            grade_level = None
            course_name = "Unknown Course"
        else:
            grade_level = course_info.get("grade_level")
            course_name = course_info.get("course_name", "Unknown Course")

        records.append(
            {
                "student_id": student_id,
                "student_name": student_name,
                "grade_level": grade_level,
                "school_year": school_year,
                "term": term,
                "course_code": course_code,
                "course_name": course_name,
                "narrative_text": narrative_text,
                "tags": [],
                "meta": {},
                "source_file": source_file,
                "saved_at": saved_at,
            }
        )

    # Sort: primary = course_code, secondary = student_name
    records.sort(key=lambda r: (r["course_code"], r["student_name"]))
    return records, warnings


def build_output_document(data, school_year, term, source_file, records):
    """Assemble the canonical output document.

    Args:
        data (dict): Original parsed legacy document (used to read
            ``version`` and ``saved``).
        school_year (str): e.g. ``"2025-2026"``.
        term (str): ``"Fall"`` or ``"Spring"``.
        source_file (str): Base name of the input file.
        records (list[dict]): Converted record list from
            :func:`convert_records`.

    Returns:
        dict: The canonical archive document ready to be serialised.
    """
    version = data.get("version", 1)
    saved_at = data.get("saved", "")
    return {
        "version": version,
        "school_year": school_year,
        "term": term,
        "source_file": source_file,
        "saved_at": saved_at,
        "records": records,
    }


def write_json(path, data):
    """Write *data* as pretty-printed JSON to *path*.

    Parent directories are created automatically if they do not exist.

    Args:
        path (str): Destination file path.
        data (dict | list): JSON-serialisable data.

    Raises:
        SystemExit: If the file cannot be written.
    """
    parent = os.path.dirname(path)
    if parent:
        os.makedirs(parent, exist_ok=True)
    try:
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(data, fh, indent=2, ensure_ascii=False)
            fh.write("\n")  # end file with a newline
    except OSError as exc:
        sys.exit(f"Error: Could not write output file '{path}': {exc}")


def validate_input_data(data, input_path):
    """Validate the structure of the parsed legacy document.

    Args:
        data (dict): Parsed JSON data.
        input_path (str): File path (used in error messages).

    Raises:
        SystemExit: On any validation failure.
    """
    if not isinstance(data, dict):
        sys.exit(
            f"Error: Expected a JSON object at the top level of '{input_path}'."
        )
    if "narratives" not in data:
        sys.exit(
            f"Error: '{input_path}' is missing the required 'narratives' key."
        )
    if not isinstance(data["narratives"], dict):
        sys.exit(
            f"Error: 'narratives' in '{input_path}' must be a JSON object."
        )


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------


def build_arg_parser():
    """Return the configured :class:`argparse.ArgumentParser`.

    Returns:
        argparse.ArgumentParser: Ready-to-use parser.
    """
    parser = argparse.ArgumentParser(
        prog="convert_legacy_narratives.py",
        description=(
            "Convert a legacy semester narrative JSON file into the "
            "canonical archive format."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Example:\n"
            "  python scripts/convert_legacy_narratives.py \\\n"
            "    --input data/raw/narratives_spring2026_save-34.json \\\n"
            "    --output data/terms/narratives_2025-2026_spring.json \\\n"
            "    --school-year 2025-2026 \\\n"
            "    --term Spring"
        ),
    )
    parser.add_argument(
        "--input",
        required=True,
        metavar="PATH",
        help="Path to the legacy narrative JSON file.",
    )
    parser.add_argument(
        "--output",
        required=True,
        metavar="PATH",
        help="Destination path for the converted archive JSON file.",
    )
    parser.add_argument(
        "--school-year",
        required=True,
        metavar="YEAR",
        help='School year in YYYY-YYYY format, e.g. "2025-2026".',
    )
    parser.add_argument(
        "--term",
        required=True,
        choices=sorted(VALID_TERMS),
        metavar="TERM",
        help=f"Academic term. Must be one of: {', '.join(sorted(VALID_TERMS))}.",
    )
    parser.add_argument(
        "--course-map",
        default=None,
        metavar="PATH",
        help=(
            "Optional path to a JSON file mapping course codes to grade "
            "level and course name. Uses the built-in map when omitted."
        ),
    )
    return parser


def main():
    """Run the legacy narrative conversion from the command line."""
    parser = build_arg_parser()
    args = parser.parse_args()

    # Validate term explicitly so the error message is clear.
    if args.term not in VALID_TERMS:
        parser.error(
            f"--term must be one of {sorted(VALID_TERMS)}, got: '{args.term}'"
        )

    # Load inputs.
    raw_data = load_json(args.input)
    validate_input_data(raw_data, args.input)
    course_map = load_course_map(args.course_map)

    source_file = os.path.basename(args.input)

    # Convert.
    records, warnings = convert_records(
        raw_data, args.school_year, args.term, source_file, course_map
    )

    # Build and write output.
    output_doc = build_output_document(
        raw_data, args.school_year, args.term, source_file, records
    )
    write_json(args.output, output_doc)

    # Print warnings.
    for warning in warnings:
        print(f"Warning: {warning}", file=sys.stderr)

    # Print summary.
    print(
        f"\nConversion complete:"
        f"\n  Input file  : {args.input}"
        f"\n  Output file : {args.output}"
        f"\n  Narratives  : {len(records)} converted"
        f"\n  Warnings    : {len(warnings)}"
    )


if __name__ == "__main__":
    main()
