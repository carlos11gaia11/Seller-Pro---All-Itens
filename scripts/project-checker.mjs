import { access, readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const DEFAULT_PROTECTED_PAGES = [
  'paginas/menu.html',
  'paginas/ares.html',
  'paginas/lojas-prontas.html',
  'paginas/estoque.html',
  'paginas/lista-treinamento.html',
  'paginas/perfil.html',
  'paginas/perfil-lider.html',
];

const URL_PATTERN = /\b(?:src|href)\s*=\s*["']([^"']+)["']/gi;
const INLINE_SCRIPT_PATTERN = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
const IGNORED_PREFIXES = [
  '#',
  'http://',
  'https://',
  '//',
  'data:',
  'blob:',
  'mailto:',
  'tel:',
  'javascript:',
  '${',
  '{{',
];

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === '.worktrees' || entry.name === 'node_modules') continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else files.push(absolute);
  }

  return files;
}

function normalizeReference(reference) {
  return reference.split('#')[0].split('?')[0].trim();
}

function shouldIgnore(reference) {
  const normalized = reference.trim().toLowerCase();
  return !normalized || IGNORED_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function resolveReference(root, htmlFile, reference) {
  const clean = decodeURIComponent(normalizeReference(reference));
  if (clean.startsWith('/')) return path.join(root, clean.slice(1));
  return path.resolve(path.dirname(htmlFile), clean);
}

export async function auditProject(root, options = {}) {
  const projectRoot = path.resolve(root);
  const protectedPages = options.protectedPages ?? DEFAULT_PROTECTED_PAGES;
  const errors = [];
  const warnings = [];
  const files = await walk(projectRoot);
  const htmlFiles = files.filter((file) => file.endsWith('.html'));

  for (const htmlFile of htmlFiles) {
    const contents = await readFile(htmlFile, 'utf8');
    const relativeHtml = path.relative(projectRoot, htmlFile).replaceAll(path.sep, '/');
    URL_PATTERN.lastIndex = 0;

    for (const match of contents.matchAll(URL_PATTERN)) {
      const reference = match[1];
      if (shouldIgnore(reference)) continue;
      const resolved = resolveReference(projectRoot, htmlFile, reference);
      if (!await exists(resolved)) {
        errors.push(`${relativeHtml}: referência local inexistente: ${reference}`);
      }
    }

    INLINE_SCRIPT_PATTERN.lastIndex = 0;
    let inlineScriptIndex = 0;

    for (const match of contents.matchAll(INLINE_SCRIPT_PATTERN)) {
      const attributes = match[1] || '';
      const source = match[2] || '';
      if (/\bsrc\s*=/i.test(attributes)) continue;

      const typeMatch = attributes.match(/\btype\s*=\s*["']([^"']+)["']/i);
      const type = typeMatch?.[1]?.trim().toLowerCase() || 'text/javascript';
      const isClassicJavaScript = [
        'text/javascript',
        'application/javascript',
        'application/ecmascript',
        'text/ecmascript',
      ].includes(type);

      if (!isClassicJavaScript) continue;
      inlineScriptIndex += 1;
      if (!source.trim()) continue;

      try {
        new vm.Script(source, { filename: `${relativeHtml}#inline-${inlineScriptIndex}` });
      } catch (error) {
        const message = String(error?.message || error).split('\n')[0];
        errors.push(`${relativeHtml}: script inline ${inlineScriptIndex} inválido: ${message}`);
      }
    }
  }

  for (const page of protectedPages) {
    const filePath = path.join(projectRoot, page);
    if (!await exists(filePath)) {
      errors.push(`${page}: página protegida não encontrada`);
      continue;
    }
    const contents = await readFile(filePath, 'utf8');
    if (!contents.includes('app-core.js')) {
      errors.push(`${page}: página protegida sem assets/js/app-core.js`);
    }
  }

  for (const file of files) {
    const extension = path.extname(file).toLowerCase();
    if (!['.pdf', '.pptx', '.docx', '.xlsx'].includes(extension)) continue;
    const details = await stat(file);
    if (details.size < 2048) {
      warnings.push(`${path.relative(projectRoot, file).replaceAll(path.sep, '/')}: arquivo muito pequeno (${details.size} bytes); validar origem`);
    }
  }

  return {
    errors: [...new Set(errors)].sort(),
    warnings: [...new Set(warnings)].sort(),
    inspectedFiles: files.length,
    inspectedHtmlFiles: htmlFiles.length,
  };
}

async function main() {
  const currentFile = fileURLToPath(import.meta.url);
  const projectRoot = path.resolve(path.dirname(currentFile), '..');
  const report = await auditProject(projectRoot);

  console.log(`Arquivos verificados: ${report.inspectedFiles}`);
  console.log(`Páginas HTML verificadas: ${report.inspectedHtmlFiles}`);

  for (const warning of report.warnings) console.warn(`AVISO: ${warning}`);
  for (const error of report.errors) console.error(`ERRO: ${error}`);

  if (report.errors.length) process.exitCode = 1;
  else console.log('Verificação estrutural concluída sem erros.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
