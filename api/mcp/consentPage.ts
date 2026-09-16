
type ConsentParams = {
  client_id: string;
  redirect_uri: string;
  state: string;
  code_challenge: string;
  scope: string;
  resource: string;
};

const SCOPE_COPY: Record<string, string> = {
  read: "Read your groups, slates, picks, and records",
  write: "Set your group's weekly slate (slate-pickers only)",
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const json = (v: unknown) => JSON.stringify(v).replace(/</g, "\\u003c");

export const consentPage = (opts: {
  clientName: string;
  params: ConsentParams;
  firebaseConfig: string;
}): string => {
  const scopes = opts.params.scope.split(" ").filter(Boolean);
  let config: unknown = {};
  try {
    config = JSON.parse(opts.firebaseConfig);
  } catch {
    config = {};
  }

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Connect to Soup Pick 'em</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px;
    background: #0A0E1A; color: #E6E9F0;
    font: 15px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  .card {
    width: 100%; max-width: 420px; background: #141929; border: 1px solid #232A3D;
    border-radius: 16px; padding: 28px;
  }
  h1 { font-size: 19px; margin: 0 0 6px; letter-spacing: -0.01em; }
  .sub { color: #99A1B3; font-size: 14px; margin: 0 0 20px; }
  .client { color: #E6E9F0; font-weight: 600; }
  ul { list-style: none; padding: 0; margin: 0 0 20px; }
  li { display: flex; gap: 10px; align-items: flex-start; padding: 9px 0; border-top: 1px solid #232A3D; font-size: 14px; }
  li:last-child { border-bottom: 1px solid #232A3D; }
  .tick { color: #4ADE80; flex: none; }
  label { display: block; font-size: 13px; color: #99A1B3; margin: 0 0 5px; }
  input {
    width: 100%; padding: 10px 12px; margin-bottom: 12px; border-radius: 9px;
    border: 1px solid #2B3348; background: #0F1420; color: #E6E9F0; font-size: 14px;
  }
  input:focus { outline: 2px solid #3B82F6; outline-offset: -1px; border-color: transparent; }
  button {
    width: 100%; min-height: 44px; padding: 11px 16px; border-radius: 9px;
    border: 0; font-size: 14px; font-weight: 600; cursor: pointer;
  }
  .primary { background: #3B82F6; color: #fff; }
  .primary:hover:not(:disabled) { background: #2F76EA; }
  .google { background: #1C2333; color: #E6E9F0; border: 1px solid #2B3348; margin-bottom: 12px; }
  .google:hover:not(:disabled) { background: #222A3D; }
  button:disabled { opacity: .55; cursor: default; }
  .sep { display: flex; align-items: center; gap: 10px; color: #6B7488; font-size: 12px; margin: 14px 0; }
  .sep::before, .sep::after { content: ""; flex: 1; height: 1px; background: #232A3D; }
  .err { color: #F87171; font-size: 13px; min-height: 18px; margin: 10px 0 0; }
  .foot { color: #6B7488; font-size: 12px; margin: 16px 0 0; text-align: center; }
</style>
</head>
<body>
  <main class="card">
    <h1>Connect to Soup Pick 'em</h1>
    <p class="sub"><span class="client">${esc(opts.clientName)}</span> wants access to your account.</p>

    <ul>
      ${scopes
      .map(
        (s) =>
          `<li><span class="tick">&#10003;</span><span>${esc(SCOPE_COPY[s] ?? s)}</span></li>`
      )
      .join("\n      ")}
    </ul>

    <form id="pw" autocomplete="on">
      <button type="button" class="google" id="google">Continue with Google</button>
      <div class="sep">or sign in with email</div>
      <label for="email">Email</label>
      <input id="email" type="email" autocomplete="username" required />
      <label for="password">Password</label>
      <input id="password" type="password" autocomplete="current-password" required />
      <button type="submit" class="primary" id="submit">Sign in &amp; authorize</button>
    </form>

    <p class="err" id="err" role="alert"></p>
    <p class="foot">You can revoke this access at any time from your profile.</p>
  </main>

<script type="module">
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const PARAMS = ${json(opts.params)};
const app = initializeApp(${json(config)});
const auth = getAuth(app);

const err = document.getElementById("err");
const submit = document.getElementById("submit");
const googleBtn = document.getElementById("google");

const busy = (on) => { submit.disabled = on; googleBtn.disabled = on; };

async function authorize(cred) {
  const idToken = await cred.user.getIdToken();
  const res = await fetch("/api/mcp/oauth/approve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken, ...PARAMS })
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error_description || body.error || "Authorization failed");
  }
  const { code } = await res.json();
  const target = new URL(PARAMS.redirect_uri);
  target.searchParams.set("code", code);
  if (PARAMS.state) target.searchParams.set("state", PARAMS.state);
  window.location.assign(target.toString());
}

const friendly = (e) => {
  const c = e && e.code ? String(e.code) : "";
  if (c.includes("invalid-credential") || c.includes("wrong-password") || c.includes("user-not-found"))
    return "Incorrect email or password.";
  if (c.includes("popup-closed")) return "Sign-in window was closed.";
  if (c.includes("too-many-requests")) return "Too many attempts — try again shortly.";
  return (e && e.message) || "Something went wrong.";
};

document.getElementById("pw").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  err.textContent = "";
  busy(true);
  try {
    await authorize(await signInWithEmailAndPassword(
      auth,
      document.getElementById("email").value,
      document.getElementById("password").value
    ));
  } catch (e) {
    err.textContent = friendly(e);
    busy(false);
  }
});

googleBtn.addEventListener("click", async () => {
  err.textContent = "";
  busy(true);
  try {
    await authorize(await signInWithPopup(auth, new GoogleAuthProvider()));
  } catch (e) {
    err.textContent = friendly(e);
    busy(false);
  }
});
</script>
</body>
</html>`;
};
