# Extension subproject. The install step is handled by packaging (task 14);
# for now we only validate schemas and produce the EGO zip in the build dir.

zip_name = 'systats.zip'
schemas_dir = meson.current_source_dir() / 'schemas'

custom_target(
  'systats-zip',
  output: zip_name,
  command: [
    find_program('python3', required: true),
    meson.current_source_dir() / '..' / 'scripts' / 'make-zip.py',
    '@OUTPUT@',
    meson.current_source_dir(),
  ],
  build_by_default: true,
  build_always_stale: true,
)

test(
  'gschema-compiles',
  find_program('glib-compile-schemas', required: true),
  args: ['--dry-run', '--strict', schemas_dir],
)
