#!/usr/bin/env node
// infra-guard: MCP server de demo. Escanea archivos .tf y reporta riesgos básicos.
// Solo lectura: no ejecuta terraform ni toca AWS.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "node:fs";
import path from "node:path";

const REQUIRED_TAGS = ["Owner", "Environment", "CostCenter"];
const TAGGABLE = ["aws_instance", "aws_s3_bucket", "aws_security_group", "aws_db_instance", "aws_lb"];

// Devuelve [{type, name, body, line}] con matching de llaves simple.
function parseResources(src) {
  const out = [];
  const re = /resource\s+"([^"]+)"\s+"([^"]+)"\s*\{/g;
  let m;
  while ((m = re.exec(src))) {
    let depth = 1, i = re.lastIndex;
    while (i < src.length && depth > 0) {
      if (src[i] === "{") depth++;
      else if (src[i] === "}") depth--;
      i++;
    }
    out.push({
      type: m[1],
      name: m[2],
      body: src.slice(re.lastIndex, i - 1),
      line: src.slice(0, m.index).split("\n").length,
    });
  }
  return out;
}

function findTfFiles(target) {
  const stat = fs.statSync(target);
  if (stat.isFile()) return target.endsWith(".tf") ? [target] : [];
  return fs.readdirSync(target, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".tf"))
    .map((e) => path.join(target, e.name));
}

function scan(target) {
  const files = findTfFiles(target);
  const all = files.flatMap((file) =>
    parseResources(fs.readFileSync(file, "utf8")).map((r) => ({ ...r, file }))
  );
  const hasSseConfig = all.some((r) => r.type === "aws_s3_bucket_server_side_encryption_configuration");
  const findings = [];
  const add = (r, severity, rule, message) =>
    findings.push({ severity, rule, resource: `${r.type}.${r.name}`, file: path.basename(r.file), line: r.line, message });

  for (const r of all) {
    if (r.type === "aws_security_group") {
      const ingress = r.body.match(/ingress\s*\{[\s\S]*?\n\s*\}/g) || [];
      for (const block of ingress) {
        const open = /0\.0\.0\.0\/0/.test(block);
        const from = Number((block.match(/from_port\s*=\s*(\d+)/) || [])[1]);
        const to = Number((block.match(/to_port\s*=\s*(\d+)/) || [])[1]);
        if (open && [22, 3389].some((p) => from <= p && p <= to))
          add(r, "high", "SG_ADMIN_PORT_OPEN", `Puerto de administración (${from}-${to}) abierto a 0.0.0.0/0. Restringir a una IP o usar SSM.`);
      }
    }
    if (r.type === "aws_db_instance") {
      if (/publicly_accessible\s*=\s*true/.test(r.body))
        add(r, "high", "RDS_PUBLIC", "Base de datos con acceso público.");
      if (!/storage_encrypted\s*=\s*true/.test(r.body))
        add(r, "medium", "RDS_NOT_ENCRYPTED", "Storage sin cifrar (falta storage_encrypted = true).");
    }
    if (r.type === "aws_s3_bucket" && !hasSseConfig)
      add(r, "medium", "S3_NO_SSE", "No hay configuración de cifrado (aws_s3_bucket_server_side_encryption_configuration) en lo escaneado.");
    if (TAGGABLE.includes(r.type)) {
      const tagsBlock = (r.body.match(/tags\s*=\s*\{([\s\S]*?)\}/) || [])[1];
      if (!tagsBlock) add(r, "low", "MISSING_TAGS", `Sin tags. Requeridos: ${REQUIRED_TAGS.join(", ")}.`);
      else {
        const missing = REQUIRED_TAGS.filter((t) => !new RegExp(`\\b${t}\\b`).test(tagsBlock));
        if (missing.length) add(r, "low", "MISSING_TAGS", `Faltan tags: ${missing.join(", ")}.`);
      }
    }
  }
  const order = { high: 0, medium: 1, low: 2 };
  findings.sort((a, b) => order[a.severity] - order[b.severity]);
  return { files: files.map((f) => path.basename(f)), resources: all.length, findings };
}

const server = new McpServer({ name: "infra-guard", version: "0.1.0" });

server.registerTool(
  "scan_terraform",
  {
    title: "Escanear Terraform",
    description:
      "Escanea archivos .tf de una carpeta (o un archivo) y devuelve hallazgos de seguridad y tagging ordenados por severidad. Solo lectura.",
    inputSchema: { path: z.string().describe("Ruta absoluta a una carpeta con .tf o a un archivo .tf") },
    annotations: { readOnlyHint: true },
  },
  async ({ path: target }) => {
    try {
      const result = scan(path.resolve(target));
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (e) {
      return { isError: true, content: [{ type: "text", text: `No pude escanear: ${e.message}` }] };
    }
  }
);

server.registerTool(
  "get_tagging_standard",
  {
    title: "Estándar de tagging",
    description: "Devuelve los tags obligatorios que exige la empresa en cada recurso AWS.",
    inputSchema: {},
    annotations: { readOnlyHint: true },
  },
  async () => ({ content: [{ type: "text", text: JSON.stringify({ requiredTags: REQUIRED_TAGS }) }] })
);

await server.connect(new StdioServerTransport());
