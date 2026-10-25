# Extension subproject. The install step is handled by packaging (task 14);
# for now we only validate schemas and produce the EGO zip in the build dir.

zip_name = 'nimbus.zip'
schemas_dir = meson.current_source_dir() / 'schemas'

custom_target(
  'nimbus-zip',
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

gjs_program = find_program('gjs', required: true)
test(
  'nimbus-units',
  gjs_program,
  args: ['-m', meson.project_source_root() / 'extension' / 'test' / 'run-tests.js'],
  env: ['NIMBUS_TEST_ROOT=' + meson.project_source_root()],
)
