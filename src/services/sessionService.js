import { supabase } from "../lib/supabase";

function decodeSessionId(accessToken) {
  if (!accessToken) return "";
  try {
    const payload = JSON.parse(atob(accessToken.split(".")[1].replaceAll("-", "+").replaceAll("_", "/")));
    return payload.session_id ?? "";
  } catch {
    return "";
  }
}

function getDeviceDetails() {
  const userAgent = navigator.userAgent || "";
  const deviceStorageKey = "workbench.deviceId";
  let deviceId = localStorage.getItem(deviceStorageKey);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(deviceStorageKey, deviceId);
  }
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);
  const browser = /Edg\//.test(userAgent) ? "Edge" : /Chrome\//.test(userAgent) ? "Chrome" : /Firefox\//.test(userAgent) ? "Firefox" : /Safari\//.test(userAgent) ? "Safari" : "Browser";
  const platform = /Windows/i.test(userAgent) ? "Windows" : /Mac OS X/i.test(userAgent) ? "Mac" : /Android/i.test(userAgent) ? "Android" : /iPhone|iPad|iPod/i.test(userAgent) ? "iOS" : "Linux";
  return {
    deviceId,
    deviceName: `${platform} ${browser}`,
    browserName: browser,
    operatingSystem: platform,
    deviceType: isMobile ? (/iPad|Tablet/i.test(userAgent) ? "tablet" : "mobile") : "desktop",
    userAgent,
  };
}

export async function registerCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const sessionId = decodeSessionId(data.session?.access_token);
  if (!sessionId) return null;
  const details = getDeviceDetails();
  const { data: registeredSession, error: registerError } = await supabase.functions.invoke("register-session", {
    body: {
      sessionId,
      deviceId: details.deviceId,
      deviceName: details.deviceName,
      deviceType: details.deviceType,
      browserName: details.browserName,
      operatingSystem: details.operatingSystem,
    },
  });
  if (registerError) throw registerError;
  return { ...registeredSession, is_current: true };
}

export async function listCurrentUserSessions() {
  const [{ data: sessionData, error: sessionError }, { data: sessions, error }] = await Promise.all([
    supabase.auth.getSession(),
    supabase.rpc("list_current_user_sessions"),
  ]);
  if (sessionError) throw sessionError;
  if (error) throw error;
  const currentSessionId = decodeSessionId(sessionData.session?.access_token);
  return (sessions ?? []).map((session) => ({ ...session, is_current: session.session_id === currentSessionId }));
}

export async function isCurrentSessionValid() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const sessionId = decodeSessionId(data.session?.access_token);
  if (!sessionId) return false;

  const { data: isValid, error: validationError } = await supabase.rpc("is_current_user_session_valid", {
    target_session_id: sessionId,
  });
  if (validationError) throw validationError;
  return isValid === true;
}

export async function subscribeToSessionRevocations(userId, onRevoked) {
  await supabase.realtime.setAuth();
  const channel = supabase
    .channel(`user-session:${userId}`, { config: { private: true } })
    .on("broadcast", { event: "session-revoked" }, onRevoked);
  channel.subscribe();
  return () => { supabase.removeChannel(channel); };
}

export async function revokeCurrentUserSession(sessionId) {
  const { error } = await supabase.rpc("revoke_current_user_session", { target_session_id: sessionId });
  if (error) throw error;
}
