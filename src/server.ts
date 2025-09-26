// deno run --allow-env --allow-net --allow-read server.ts
import { serve } from "https://deno.land/std/http/server.ts";

// 定义配置接口
interface Config {
  UUID: string;
  SUB_PATH: string;
  XPATH: string;
  DOMAIN: string;
  NAME: string;
  PORT: number;
}

// 用异步函数读取 JSON 文件并启动服务器
(async () => {
  // 读取 config.json
  const configText = await Deno.readTextFile("./config.json");
  const config: Config = JSON.parse(configText);

  // 使用环境变量优先，否则使用 config.json
  const UUID: string = Deno.env.get("UUID") || config.UUID;
  const SUB_PATH: string = Deno.env.get("SUB_PATH") || config.SUB_PATH;
  const XPATH: string = Deno.env.get("XPATH") || config.XPATH;
  const DOMAIN: string = Deno.env.get("DOMAIN") || config.DOMAIN;
  const NAME: string = Deno.env.get("NAME") || config.NAME;
  const PORT: number = parseInt(Deno.env.get("PORT") || String(config.PORT));

  // 工具函数
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

  // 启动 HTTP 服务
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

    // VLESS 转发（简化版，只校验 UUID）
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
})();
