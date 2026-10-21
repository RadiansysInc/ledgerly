declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    BREVO_API_KEY?: string;
    BREVO_FROM_EMAIL?: string;
    BREVO_FROM_NAME?: string;
    AUTH_EMAIL?: string;
    AUTH_PASSWORD?: string;
    AUTH_SECRET?: string;
  }
}
