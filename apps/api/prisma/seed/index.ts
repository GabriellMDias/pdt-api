import { runModules, prisma } from "./helpers";
import seedCore from "./modules/01-core";
import seedPermissions from "./modules/02-permissions";
import seedStatus from "./modules/03-status";
import seedParameters from "./modules/04-parameters";
import seedAnalyses from "./modules/05-analyses";
import seedDailyResultConfig from "./modules/06-daily-result-config";

type ModuleEntry = [string, () => Promise<void>];

const ALL_MODULES: ModuleEntry[] = [
  ["core",        seedCore],
  ["permissions", seedPermissions],
  ["status",      seedStatus],
  ["parameters",  seedParameters],
  ["analyses", seedAnalyses],
  ["daily-result-config", seedDailyResultConfig],
];

/** Permite filtrar módulos via ENV ou args: SEED_MODULES=core,permissions */
function selectModules(): ModuleEntry[] {
  const envCsv = process.env.SEED_MODULES;
  const arg = process.argv.find(a => a.startsWith("--modules="));
  const csv = envCsv ?? (arg ? arg.split("=")[1] : "");

  if (!csv) return ALL_MODULES;
  const want = new Set(csv.split(",").map(s => s.trim()).filter(Boolean));
  return ALL_MODULES.filter(([name]) => want.has(name));
}

(async () => {
  try {
    const mods = selectModules();
    await runModules(mods);
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
