import { apiGetMpStatus, setStoredAccessToken, setStoredRefreshToken } from "../api/api";
import { MpStatus, EmailStatus } from "../types/security";

export type AuthLike = {
  authenticate: (accessToken: string, refreshToken: string) => void;
};

export type SecurityOps = {
  localMpStatus: MpStatus;
  setMpStatus: (status: MpStatus) => Promise<void> | void;
  setAccountAccess: (access: "CLOUD" | "LOCAL_ONLY") => Promise<void> | void;
  setEmailStatus: (status: EmailStatus) => Promise<void> | void;
};

// Shapes we may receive
// 1) Classic login response (from /user/login):
//    { message, type, accessToken, refreshToken, security: { serverEmail, serverAccess, mpStatus, ... } }
// 2) Standardized envelope (social):
//    { success: true, code: "*_LOGIN_OK", message: "OK", data: { type, accessToken, refreshToken, security: {...} } }
// This helper will accept either the outer envelope or the classic payload,
// and normalize to { accessToken, refreshToken, security }.

function extractPayload(
  input: any,
): { accessToken?: string; refreshToken?: string; security?: any } | null {
  if (!input || typeof input !== "object") return null;
  // If standardized envelope
  if (Object.prototype.hasOwnProperty.call(input, "success") && input.data) {
    return input.data;
  }
  // If already the classic payload shape
  if (Object.prototype.hasOwnProperty.call(input, "accessToken")) {
    return input as any;
  }
  // If the caller passed { data: classic }
  if (input.data && typeof input.data === "object") {
    const inner = input.data;
    if (Object.prototype.hasOwnProperty.call(inner, "accessToken")) return inner;
  }
  return null;
}

// Update security context using flexible server shapes.
async function applySecurity(security: any, ops: SecurityOps): Promise<boolean> {
  try {
    if (!security) return false;
    let mpStatusSynced = false;

    // Only sync mpStatus when the server explicitly provides it.
    // undefined => missing from payload (do not override local); null => treat as "NONE".
    const serverMpStatusRaw = security.mpStatus as MpStatus | null | undefined;
    if (serverMpStatusRaw !== undefined) {
      const serverMpStatus: MpStatus = serverMpStatusRaw === null ? "NONE" : serverMpStatusRaw;
      if (
        serverMpStatus === "NONE" ||
        serverMpStatus === "PENDING" ||
        serverMpStatus === "CONFIGURED" ||
        serverMpStatus === "SKIPPED"
      ) {
        if (serverMpStatus !== ops.localMpStatus) {
          await ops.setMpStatus(serverMpStatus);
        }
        mpStatusSynced = true;
      }
    }

    // account access may come as boolean serverAccess or boolean accountAccess
    const serverAccessRaw: boolean | undefined =
      typeof security.serverAccess === "boolean"
        ? security.serverAccess
        : typeof security.accountAccess === "boolean"
          ? security.accountAccess
          : undefined;

    if (typeof serverAccessRaw === "boolean") {
      await ops.setAccountAccess(serverAccessRaw ? "CLOUD" : "LOCAL_ONLY");
    }

    // email status may come as a string enum OR boolean serverEmail
    const emailStatusMaybe = security.emailStatus as EmailStatus | undefined;
    if (emailStatusMaybe === "VERIFIED" || emailStatusMaybe === "UNVERIFIED") {
      await ops.setEmailStatus(emailStatusMaybe);
    } else if (
      typeof security.serverEmail === "boolean" ||
      typeof security.serverEmail === "number"
    ) {
      await ops.setEmailStatus(security.serverEmail ? "VERIFIED" : "UNVERIFIED");
    }
    return mpStatusSynced;
  } catch (e) {
    // non-fatal; keep login flowing
    // console.log("applySecurity: failed to update security state");
    return false;
  }
}

/**
 * Applies a server login response to app state: updates security context and calls authenticate.
 * Returns true if tokens were applied, false otherwise.
 */
export async function applyPostLogin(
  envelopeOrPayload: any,
  auth: AuthLike,
  ops: SecurityOps,
): Promise<{ ok: boolean; reason?: string }> {
  const payload = extractPayload(envelopeOrPayload);
  if (!payload) return { ok: false, reason: "Invalid login response" };

  const accessToken = payload.accessToken as string | undefined;
  const refreshToken = payload.refreshToken as string | undefined;
  const security = payload.security as any;

  const mpStatusSynced = await applySecurity(security, ops);

  if (accessToken && refreshToken) {
    setStoredAccessToken(accessToken);
    setStoredRefreshToken(refreshToken);

    if (!mpStatusSynced) {
      try {
        const resp = await apiGetMpStatus();
        const serverMpStatus = resp?.data?.mpStatus as MpStatus | null | undefined;
        const normalized: MpStatus | null =
          serverMpStatus === null ? "NONE" : (serverMpStatus ?? null);
        if (
          normalized === "NONE" ||
          normalized === "PENDING" ||
          normalized === "CONFIGURED" ||
          normalized === "SKIPPED"
        ) {
          if (normalized !== ops.localMpStatus) {
            await ops.setMpStatus(normalized);
          }
        }
      } catch {}
    }
    auth.authenticate(accessToken, refreshToken);
    return { ok: true };
  }

  return { ok: false, reason: "Missing tokens" };
}
