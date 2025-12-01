#!/usr/bin/env node
/**
 * Script para sincronizar y traducir documentación
 * - Detecta cambios en docs técnicos (inglés)
 * - Los traduce al español usando Claude CLI (si está disponible)
 * - Genera recordatorios si hay docs desactualizados
 */

import { execSync, spawn } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, basename, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Configuración
const CONFIG = {
  // Docs en español (principal) - escritos por humanos
  mainDocsDir: 'docs',
  // Docs técnicos generados (pueden estar en inglés)
  technicalDocsDir: 'docs/technical',
  // Archivos que necesitan traducción
  filesToTranslate: [
    'README.md',
    'CONTRIBUTING.md',
    'CHANGELOG.md'
  ],
  // Claude CLI disponible?
  useClaudeCli: false // cambiar a true si tenés Claude CLI instalado
};

function checkClaudeCli() {
  try {
    execSync('which claude', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function getChangedDocs() {
  try {
    const staged = execSync('git diff --cached --name-only', { encoding: 'utf-8' });
    const docs = staged.split('\n').filter(f => f.endsWith('.md'));
    return docs;
  } catch {
    return [];
  }
}

function translateWithClaude(text, targetLang = 'español argentino') {
  if (!CONFIG.useClaudeCli) {
    console.log('⚠️  Claude CLI no configurado. Traducción manual requerida.');
    return null;
  }

  try {
    const prompt = `Traducí el siguiente texto técnico al ${targetLang}.
Mantené un tono semi-formal, natural, no robótico.
Usá "vos" en lugar de "tú".
Preservá el formato markdown exactamente.
No agregues explicaciones, solo devolvé la traducción:

${text}`;

    const result = execSync(`echo "${prompt.replace(/"/g, '\\"')}" | claude --print`, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024
    });
    return result;
  } catch (error) {
    console.error('Error traduciendo con Claude:', error.message);
    return null;
  }
}

function checkDocsNeedUpdate() {
  const issues = [];

  // Verificar que README.md existe y tiene contenido en español
  const readmePath = join(ROOT, 'README.md');
  if (existsSync(readmePath)) {
    const content = readFileSync(readmePath, 'utf-8');
    // Detectar si está mayormente en inglés
    const englishWords = (content.match(/\b(the|and|is|are|this|that|with|for|you|your)\b/gi) || []).length;
    const spanishWords = (content.match(/\b(el|la|los|las|que|con|para|este|esta|son|una|uno)\b/gi) || []).length;

    if (englishWords > spanishWords * 2) {
      issues.push({
        file: 'README.md',
        issue: 'Parece estar en inglés - considerar traducir al español',
        severity: 'warning'
      });
    }
  }

  // Verificar CHANGELOG actualizado
  const changelogPath = join(ROOT, 'CHANGELOG.md');
  if (existsSync(changelogPath)) {
    const content = readFileSync(changelogPath, 'utf-8');
    const lastUpdate = content.match(/## \[[\d.]+\] - (\d{4}-\d{2}-\d{2})/);
    if (lastUpdate) {
      const lastDate = new Date(lastUpdate[1]);
      const daysSince = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince > 30) {
        issues.push({
          file: 'CHANGELOG.md',
          issue: `Última actualización hace ${Math.floor(daysSince)} días`,
          severity: 'info'
        });
      }
    }
  }

  return issues;
}

function main() {
  console.log('📚 Sincronizando documentación...\n');

  const hasClaudeCli = checkClaudeCli();
  if (hasClaudeCli) {
    console.log('✅ Claude CLI detectado - traducción automática disponible');
    CONFIG.useClaudeCli = true;
  } else {
    console.log('ℹ️  Claude CLI no encontrado - solo verificación');
  }

  const changedDocs = getChangedDocs();
  if (changedDocs.length > 0) {
    console.log(`\n📝 Docs modificados: ${changedDocs.join(', ')}`);
  }

  const issues = checkDocsNeedUpdate();
  if (issues.length > 0) {
    console.log('\n⚠️  Revisiones sugeridas:');
    issues.forEach(({ file, issue, severity }) => {
      const icon = severity === 'warning' ? '🟡' : 'ℹ️';
      console.log(`   ${icon} ${file}: ${issue}`);
    });
  } else {
    console.log('\n✅ Documentación al día');
  }

  console.log('\n');
}

main();
