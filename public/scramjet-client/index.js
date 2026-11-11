const frameWrapper = document.getElementById("sj-frame-wrapper");
const frameElement = document.getElementById("sj-frame");
const frameUrl = document.getElementById("sj-frame-url");
const loading = document.getElementById("sj-loading");
const errorScreen = document.getElementById("sj-error-screen");
const errorMessage = document.getElementById("sj-error");
const errorCode = document.getElementById("sj-error-code");
const errorDetailsWrap = document.getElementById("sj-error-details-wrap");

let controller;
let frame;
const params = new URL(location.href).searchParams;
const selectedEngine = params.get("engine") || "https://www.google.com/search?q=";
function resolveAddress(value) {
  const entered = String(value || "").trim();
  if (!entered) throw new Error("No search text or website address was provided.");
  if (/^[a-z][a-z\d+.-]*:/i.test(entered)) {
    try { return new URL(entered).href; }
    catch { throw new Error("That website address is not valid."); }
  }
  const looksLikeDomain = /^(?:[\w-]+\.)+[a-z]{2,}(?::\d+)?(?:[/?#].*)?$/i.test(entered) && !/\s/.test(entered);
  if (looksLikeDomain) return `https://${entered}`;
  const template = selectedEngine.includes("%s") ? selectedEngine : `${selectedEngine}%s`;
  return template.replace("%s", encodeURIComponent(entered));
}

async function init() {
  // Do not throw the unhelpful "initBootstrap is not defined" ReferenceError when the
  // hosting site has only static files and not the Scramjet bootstrap/runtime routes.
  if (typeof window.initBootstrap !== "function") {
    throw new Error("Scramjet is not configured on this website: /bootstrap-init.js is missing. The Scramjet proxy runtime and Wisp service must be deployed on the host.");
  }
  controller = await window.initBootstrap();
  if (!window.$scramjetUtils) {
    throw new Error("The Scramjet utilities bundle did not load. Check the deployed /scram/ and /utils/ runtime routes.");
  }
  const cachePlugin = new window.$scramjetUtils.HttpCachePlugin();
  const urlWatcher = new window.$scramjetUtils.UrlWatcherPlugin((url) => {
    if (frameUrl) frameUrl.textContent = url;
    try { document.title = new URL(url).hostname; } catch { document.title = "Web page"; }
  });
  const catchEscapedLinks = new window.$scramjetUtils.CatchEscapedLinksPlugin(
    (url) => new URL(`/scramjet-client/index.html?goto=${encodeURIComponent(url.href)}&engine=${encodeURIComponent(selectedEngine)}`, location.origin)
  );
  frame = controller.createFrame(frameElement, { plugins: [cachePlugin, urlWatcher, catchEscapedLinks] });
}

function showErrorScreen(message, details) {
  if (loading) loading.style.display = "none";
  if (frameWrapper) frameWrapper.style.display = "none";
  if (errorMessage) errorMessage.textContent = message || "The page could not be loaded.";
  if (errorCode) errorCode.textContent = details || "";
  if (errorDetailsWrap) errorDetailsWrap.hidden = !details;
  if (errorScreen) errorScreen.hidden = false;
  document.title = "Unable to load page";
}

async function navigate(inputValue) {
  const url = resolveAddress(inputValue);
  if (!frame || !controller) await init();
  await frame.go(url);
  if (loading) loading.style.display = "none";
  if (errorScreen) errorScreen.hidden = true;
  frameWrapper.style.display = "flex";
}

const initialTarget = params.get("goto");
if (initialTarget) {
  navigate(initialTarget).catch((err) => showErrorScreen(err?.message || String(err), err?.stack || ""));
} else {
  showErrorScreen("No destination was sent from the ESOK search bar.", "");
}
