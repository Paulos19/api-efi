import axios from "axios";
import fs from "fs";
import path from "path";
import https from "https";

let accessToken: string | null = null;
const isDev = process.env.NODE_ENV !== "production";

const certPath = path.resolve(process.cwd(), `certs/${process.env.GN_CERT}`);
const cert = fs.readFileSync(certPath);
const agent = new https.Agent({ pfx: cert, passphrase: "" });

const authenticate = async () => {
  console.log("🔑 [Autenticação] Gerando novo token...");
  const credentials = Buffer.from(
    `${process.env.GN_CLIENT_ID}:${process.env.GN_CLIENT_SECRET}`
  ).toString("base64");

  try {
    const response = await axios.post(
      `${process.env.GN_ENDPOINT}/oauth/token`,
      { grant_type: "client_credentials" },
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/json",
        },
        httpsAgent: agent,
      }
    );

    accessToken = response.data.access_token;
    console.log("✅ [Autenticação] Token gerado com sucesso!");

    return accessToken;
  } catch (error) {
    console.error("❌ [Erro Autenticação] Falha ao gerar token:", error);
    throw new Error("Erro ao autenticar com a API do Gerencianet");
  }
};

export const GNRequest = async () => {
  if (!accessToken) {
    await authenticate();
  }

  return axios.create({
    baseURL: process.env.GN_ENDPOINT,
    httpsAgent: agent,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
};

// 🔄 Criar Webhook
export const createWebhook = async () => {
  console.log("📢 [Webhook] Registrando webhook...");
  const chave = process.env.GN_PIX_KEY;

  if (!chave) {
    console.error("❌ [Erro Webhook] Chave Pix não encontrada");
    return;
  }

  try {
    const authResponse = await authenticate();
    const accessToken = authResponse;

    const data = { webhookUrl: process.env.WEBHOOK_URL };

    const response = await axios.put(
      `${process.env.GN_ENDPOINT}/v2/webhook/${chave}`,
      data,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        httpsAgent: agent,
      }
    );

    console.log("✅ [Webhook] Webhook criado com sucesso!", response.data);
  } catch (error) {
    console.error("❌ [Erro Webhook] Falha ao criar webhook:", error);
  }
};
