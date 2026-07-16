export const INTRO_SEEN_KEY = "lk-intro-v2-seen";
export const INTRO_PARAM = "intro";
export const INTRO_PARAM_OFF = "off";
export const INTRO_PARAM_REPLAY = "replay";
export const INTRO_DECISION_ATTRIBUTE = "data-lk-intro";
export const INTRO_DECISION_OFF = "off";
export const INTRO_DECISION_PLAY = "play";

/**
 * Runs before first paint so the pending intro styles only apply when the intro
 * will actually play. This is the only place the play/off rule is evaluated:
 * `globals.css` gates the darkness on the resulting attribute, and the hydrated
 * canvas reads it back via `introWillPlay()` instead of recomputing it.
 */
export const introDecisionScript = `(function(){
try{
var p=new URLSearchParams(window.location.search).get(${JSON.stringify(INTRO_PARAM)});
var reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
var seen=false;
try{seen=window.sessionStorage.getItem(${JSON.stringify(INTRO_SEEN_KEY)})==="1"}catch(e){}
var play=p!==${JSON.stringify(INTRO_PARAM_OFF)}&&!reduced&&(p===${JSON.stringify(INTRO_PARAM_REPLAY)}||!seen);
document.documentElement.setAttribute(${JSON.stringify(INTRO_DECISION_ATTRIBUTE)},play?${JSON.stringify(INTRO_DECISION_PLAY)}:${JSON.stringify(INTRO_DECISION_OFF)});
}catch(e){}
})();`;

/**
 * Mirrors the `:not([data-lk-intro="off"])` gate in `globals.css`: anything other
 * than an explicit opt-out means the pending darkness was painted, so the intro
 * must run to clear it.
 */
export function introWillPlay(): boolean {
  return (
    document.documentElement.getAttribute(INTRO_DECISION_ATTRIBUTE) !== INTRO_DECISION_OFF
  );
}
