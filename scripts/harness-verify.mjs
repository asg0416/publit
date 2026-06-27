import { spawnSync } from 'node:child_process';

const commands = [
  ['npm', ['run', 'harness:test']],
  ['supabase', ['migration', 'list', '--linked']],
  ['supabase', ['db', 'query', '--linked', "select table_name, column_name from information_schema.columns where table_schema = 'public' and table_name in ('flames','flame_reactions','reports','topics','action_events') and column_name ~* '(lat|lng|latitude|longitude|coordinates|raw_location)' order by table_name, column_name;"]],
  ['supabase', ['db', 'advisors', '--linked', '--type', 'security', '--level', 'warn']],
  ['supabase', ['db', 'advisors', '--linked', '--type', 'performance', '--level', 'warn']],
  ['supabase', ['functions', 'list', '--project-ref', 'mkqodslvmysgqwabazfm']],
];

for (const [command, args] of commands) {
  console.log(`\n$ ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: false,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
