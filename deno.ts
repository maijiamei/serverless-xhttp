// deno run --allow-env --allow-net server.ts
import { serve } from "https://deno.land/std/http/server.ts";

// ========== 环境变量 ==========
const UUID: string = Deno.env.get("UUID") || "ee4ff9db-66e5-497c-b09b-748cbcf704d6";
const SUB_PATH: string = Deno.env.get("SUB_PATH") || "sub";     // 订阅路径
const XPATH: string = Deno.env.get("XPATH") || "xhttp";         // 节点路径
const DOMAIN: string = Deno.env.get("DOMAIN") || "dihao.maijiamei.deno.net";   // 绑定的域名或IP
const NAME: string = Deno.env.get("NAME") || "Deno";            // 节点名称
const PORT: number = parseInt(Deno.env.get("PORT") || "3000");

// ========== 工具函数 ==========
function parse_uuid(uuid: string): Uint8Array {
  uuid = uuid.replaceAll("-", "");
  const r = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    r[i] = parseInt(uuid.substr(i * 2, 2), 16);
  }
  return r;
}

function validate_uuid(left: Uint8Array, right: Uint8Array): boolean {
  for (let i = 0; i < 16; i++) {
    if (left[i] !== right[i]) return false;
  }
  return true;
}

// ========== HTTP 服务 ==========
serve(async (req) => {
  const url = new URL(req.url);

  // 根路径
  if (url.pathname === "/") {
    return new Response("Hello from Deno VLESS!\n", { status: 200 });
  }

  // 节点订阅路径
  if (url.pathname === `/${SUB_PATH}`) {
    const vlessURL = `vless://${UUID}@${DOMAIN}:443?encryption=none&security=tls&sni=${DOMAIN}&fp=chrome&type=xhttp&host=${DOMAIN}&path=%2F${XPATH}&mode=packet-up#${NAME}`;
    const base64Content = btoa(vlessURL);
    return new Response(base64Content + "\n", { status: 200 });
  }

  // VLESS 转发（简化：这里只是校验 UUID，不做完整代理逻辑）
  const pathMatch = url.pathname.match(new RegExp(`/${XPATH}/([^/]+)`));
  if (pathMatch) {
    const clientUUID = pathMatch[1];
    if (!validate_uuid(parse_uuid(clientUUID), parse_uuid(UUID))) {
      return new Response("Invalid UUID", { status: 403 });
    }
    return new Response("VLESS handshake success\n", { status: 200 });
  }

  return new Response("Not Found", { status: 404 });
}, { port: PORT });

console.log(`✅ Deno VLESS server running on http://localhost:${PORT}`);
