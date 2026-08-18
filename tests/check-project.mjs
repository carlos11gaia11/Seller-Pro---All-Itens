import { auditProject } from '../scripts/project-checker.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const report = await auditProject(root);

console.log(`Arquivos verificados: ${report.inspectedFiles}`);
console.log(`Páginas HTML verificadas: ${report.inspectedHtmlFiles}`);
for (const warning of report.warnings) console.warn(`AVISO: ${warning}`);
for (const error of report.errors) console.error(`ERRO: ${error}`);

if (report.errors.length) process.exitCode = 1;
else console.log('Verificação estrutural concluída sem erros.');
