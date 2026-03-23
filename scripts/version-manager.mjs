import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..')

const packagePaths = [
  'package.json',
  'apps/api/package.json',
  'apps/web/package.json',
  'apps/mobile/package.json',
]

const semverRegex =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/

function readJson(relativePath) {
  const absolutePath = resolve(repoRoot, relativePath)
  const content = readFileSync(absolutePath, 'utf8')
  return JSON.parse(content)
}

function writeJson(relativePath, data) {
  const absolutePath = resolve(repoRoot, relativePath)
  writeFileSync(absolutePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

function validateSemver(version) {
  if (!semverRegex.test(version)) {
    throw new Error(`Versao invalida: "${version}". Use padrao SemVer (ex.: 1.2.3).`)
  }
}

function normalizeForBump(version) {
  validateSemver(version)
  return version.split('+')[0].split('-')[0]
}

function bumpVersion(version, bumpType) {
  const baseVersion = normalizeForBump(version)
  const [majorText, minorText, patchText] = baseVersion.split('.')
  const major = Number(majorText)
  const minor = Number(minorText)
  const patch = Number(patchText)

  if (!Number.isInteger(major) || !Number.isInteger(minor) || !Number.isInteger(patch)) {
    throw new Error(`Nao foi possivel interpretar a versao atual: "${version}".`)
  }

  if (bumpType === 'major') return `${major + 1}.0.0`
  if (bumpType === 'minor') return `${major}.${minor + 1}.0`
  if (bumpType === 'patch') return `${major}.${minor}.${patch + 1}`

  throw new Error(`Tipo de bump invalido: "${bumpType}". Use major, minor ou patch.`)
}

function syncAllPackages(targetVersion) {
  validateSemver(targetVersion)
  const changedPackages = []

  for (const packagePath of packagePaths) {
    const packageJson = readJson(packagePath)
    const currentVersion = packageJson.version
    if (currentVersion !== targetVersion) {
      packageJson.version = targetVersion
      writeJson(packagePath, packageJson)
      changedPackages.push({ packagePath, previous: currentVersion, next: targetVersion })
    }
  }

  return changedPackages
}

function printResult(targetVersion, changes) {
  if (!changes.length) {
    console.log(`Nenhuma alteracao necessaria. Versao atual: ${targetVersion}`)
    return
  }

  console.log(`Versao sincronizada para ${targetVersion}:`)
  for (const change of changes) {
    console.log(`- ${change.packagePath}: ${change.previous} -> ${change.next}`)
  }
}

function bumpMobileBuildCode(currentValue) {
  const value = Number(currentValue)
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(
      `androidVersionCode invalido: "${currentValue}". Defina um inteiro positivo em package.json > mobile.androidVersionCode.`,
    )
  }

  return value + 1
}

function run() {
  const [command, arg] = process.argv.slice(2)
  const rootPackage = readJson('package.json')
  const currentVersion = rootPackage.version

  if (!command) {
    throw new Error('Comando ausente. Use: sync | set <versao> | bump <major|minor|patch>.')
  }

  if (command === 'sync') {
    validateSemver(currentVersion)
    const changes = syncAllPackages(currentVersion)
    printResult(currentVersion, changes)
    return
  }

  if (command === 'set') {
    if (!arg) {
      throw new Error('Informe a versao alvo. Ex.: npm run version:set -- 1.3.0')
    }

    validateSemver(arg)
    const changes = syncAllPackages(arg)
    printResult(arg, changes)
    return
  }

  if (command === 'bump') {
    if (!arg) {
      throw new Error('Informe o tipo de bump. Ex.: npm run version:bump -- patch')
    }

    const nextVersion = bumpVersion(currentVersion, arg)
    const changes = syncAllPackages(nextVersion)
    printResult(nextVersion, changes)
    return
  }

  if (command === 'mobile-buildcode:bump') {
    const nextRootPackage = readJson('package.json')
    const currentBuildCode = nextRootPackage.mobile?.androidVersionCode
    const nextBuildCode = bumpMobileBuildCode(currentBuildCode)
    nextRootPackage.mobile = {
      ...(nextRootPackage.mobile ?? {}),
      androidVersionCode: nextBuildCode,
    }
    writeJson('package.json', nextRootPackage)
    console.log(`androidVersionCode atualizado: ${currentBuildCode} -> ${nextBuildCode}`)
    return
  }

  throw new Error(`Comando invalido: "${command}". Use sync, set, bump ou mobile-buildcode:bump.`)
}

try {
  run()
} catch (error) {
  const message = error instanceof Error ? error.message : 'Erro desconhecido.'
  console.error(`[version-manager] ${message}`)
  process.exit(1)
}
