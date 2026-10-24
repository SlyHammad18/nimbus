#!/usr/bin/env python3
"""Build the GNOME Extensions zip for EGO upload.

The zip is created in the build directory only (nothing is installed here;
installation is handled by the packaging task). Both the Python module and
the file tools used in this script are standard library only.

The zip layout matches what extensions.gnome.org expects:
    metadata.json, src/extension.js, schemas/*.xml
"""

import sys
import zipfile
from pathlib import Path

ZIP_EXCLUDE_PARTS = ('.git', 'node_modules', 'build', 'builddir')
ZIP_EXCLUDE_FILES = {'meson.build'}


def write_extension_zip(zip_path: Path, extension_root: Path) -> None:
    files = []
    for path in sorted(extension_root.rglob('*')):
        if not path.is_file():
            continue
        relative = path.relative_to(extension_root)
        if any(part in ZIP_EXCLUDE_PARTS for part in relative.parts):
            continue
        if relative.name in ZIP_EXCLUDE_FILES:
            continue
        files.append((path, relative))

    zip_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        for path, relative in files:
            zf.write(path, relative)


def main(argv: list[str]) -> int:
    zip_path = Path(argv[1])
    extension_root = Path(argv[2])

    if not extension_root.is_dir():
        print(f'extension root not found: {extension_root}', file=sys.stderr)
        return 1

    write_extension_zip(zip_path, extension_root)
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv))
